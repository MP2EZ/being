#!/bin/bash
# INFRA-692 — sweep the XCTest screen recordings a safety run leaves on its simulator.
#
# Why they exist, and why they cannot be turned off from this repo: Maestro 2.6.0 ships
# driver-iPhoneSimulator/maestro-driver-ios-config.xctestrun inside maestro-ios-driver.jar,
# re-extracted on every run, with PreferredScreenCaptureFormat=screenRecording and
# System/UserAttachmentLifetime=deleteOnSuccess. The driver test is killed at teardown, never
# succeeds, so deleteOnSuccess never fires and testmanagerd keeps one movie per flow, roughly
# 450 MB a day on the gate simulator. There is no CLI flag or env var; patching the Cellar jar
# is invisible to the DEBUG-589 version pin. Re-read those keys whenever the pin moves.
#
# What this does: snapshot the testmanagerd Attachments directory when the run takes the
# simulator lease, and delete what is NEW at exit, while the lease is still held. Attribution
# is by file-set difference, never by process. It touches only this UDID's data path, only the
# container whose metadata names com.apple.testmanagerd, only regular files at depth 1.
#
# What it does NOT reach: recordings from ad-hoc maestro runs outside e2e-safety.sh, other
# simulators, and anything already there before the run. INFRA-718 reaches those on demand:
# `npm run e2e:safety:clean:recordings` (report) / `-- --yes` (delete), via _e2e_attach_sims.
#
# Overrides:
#   E2E_KEEP_XCTEST_RECORDINGS=1    list this run's recordings and keep them (debugging a flow)
#   E2E_ATTACHMENTS_REAP_DRY_RUN=1  list what would be deleted, delete nothing
#
# Sourced-helper contract (same as e2e-driver-ownership.sh): sets no shell options, because the
# caller runs under a bare `set -u`; bash 3.2 safe; every function handles its own failure and
# returns 0, so a sweep can never change the gate's exit code.

E2E_ATTACH_DATA_PATH=""
E2E_ATTACH_SNAPSHOT=""

# The data path of the booted simulator with EXACTLY this UDID, from simctl. Never built from
# $HOME, so a custom device set is honoured; empty when the UDID is not booted.
_e2e_attach_data_path() {
  xcrun simctl list devices booted -j 2>/dev/null | UDID="$1" node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      try {
        for (const list of Object.values(JSON.parse(raw).devices || {})) {
          for (const d of list) if (d.udid === process.env.UDID && d.dataPath) { process.stdout.write(d.dataPath); return; }
        }
      } catch (_) {}
    });
  ' 2>/dev/null
  return 0
}

# INFRA-718 — every device in the default device set, booted or not, as one
# `udid<TAB>state<TAB>name<TAB>dataPath` line each, sorted. Same source as above: data paths come
# from simctl, never $HOME. A device whose dataPath does not end in /<udid>/data is dropped, never
# guessed at, and so is any field carrying a tab or newline. Kept separate from
# _e2e_attach_data_path on purpose: the gate's exact-booted-UDID behaviour must not widen.
_e2e_attach_sims() {
  xcrun simctl list devices -j 2>/dev/null | node -e '
    let raw = "";
    process.stdin.on("data", (c) => (raw += c));
    process.stdin.on("end", () => {
      const out = [];
      try {
        for (const list of Object.values(JSON.parse(raw).devices || {})) {
          for (const d of Array.isArray(list) ? list : []) {
            const f = [d && d.udid, d && d.state, d && d.name, d && d.dataPath];
            if (!f.every((v) => typeof v === "string") || !f[0] || !f[3]) continue;
            if (f.some((v) => /[\t\n\r]/.test(v))) continue;
            if (!f[3].endsWith("/" + f[0] + "/data")) continue;
            out.push(f.join("\t"));
          }
        }
      } catch (_) {}
      out.sort();
      if (out.length) process.stdout.write(out.join("\n") + "\n");
    });
  ' 2>/dev/null
  return 0
}

# Attachments directories of the testmanagerd container(s) under a data path.
_e2e_attach_dirs() {
  local meta id
  for meta in "$1"/Containers/Data/InternalDaemon/*/.com.apple.mobile_container_manager.metadata.plist; do
    [ -f "$meta" ] || continue
    id="$(plutil -extract MCMMetadataIdentifier raw -o - "$meta" 2>/dev/null)" || continue
    [ "$id" = "com.apple.testmanagerd" ] || continue
    [ -d "$(dirname "$meta")/Attachments" ] && printf '%s\n' "$(dirname "$meta")/Attachments"
  done
  return 0
}

# Regular files at depth 1 of those directories, sorted. Matched by location, never by name:
# the movies have UUID names and no extension. `-type f` does not follow symlinks.
_e2e_attach_files() {
  local dir
  _e2e_attach_dirs "$1" | while IFS= read -r dir; do
    find "$dir" -maxdepth 1 -type f 2>/dev/null
  done | LC_ALL=C sort
  return 0
}

# Take the snapshot. Call right after the simulator lease is acquired, before any flow.
e2e_attachments_snapshot() {
  local udid="${1:-}" data snap
  E2E_ATTACH_DATA_PATH=""
  E2E_ATTACH_SNAPSHOT=""
  if [ -z "$udid" ]; then
    return 0 # device-only run: no simulator, nothing to sweep
  fi
  data="$(_e2e_attach_data_path "$udid")"
  case "$data" in
    */"$udid"/data) ;;
    *)
      echo "⚠️  INFRA-692: could not resolve the data path for simulator $udid — this run's XCTest recordings will not be swept." >&2
      return 0
      ;;
  esac
  snap="$(mktemp "${TMPDIR:-/tmp}/being-e2e-attachments.XXXXXX" 2>/dev/null)" || {
    echo "⚠️  INFRA-692: could not create a snapshot file — this run's XCTest recordings will not be swept." >&2
    return 0
  }
  _e2e_attach_files "$data" >"$snap"
  E2E_ATTACH_DATA_PATH="$data"
  E2E_ATTACH_SNAPSHOT="$snap"
  return 0
}

# Delete the recordings this run created. Runs from the EXIT trap, before the lease is
# released. Makes NO xcrun call: a wedged CoreSimulator must not be able to hang the trap.
# Idempotent — the snapshot is consumed — so an INT trap followed by EXIT reaps once.
e2e_attachments_reap_run() {
  local udid="${1:-}" new f size removed=0 failed=0 bytes=0 mode="delete"
  [ -n "$udid" ] && [ -n "$E2E_ATTACH_DATA_PATH" ] && [ -f "$E2E_ATTACH_SNAPSHOT" ] || return 0
  case "$E2E_ATTACH_DATA_PATH" in
    */"$udid"/data) ;;
    *) return 0 ;;
  esac
  new="$(_e2e_attach_files "$E2E_ATTACH_DATA_PATH" | LC_ALL=C comm -13 "$E2E_ATTACH_SNAPSHOT" - 2>/dev/null)"
  rm -f "$E2E_ATTACH_SNAPSHOT" 2>/dev/null
  E2E_ATTACH_SNAPSHOT=""
  if [ -z "$new" ]; then
    echo "🧹 INFRA-692: no XCTest recordings written by this run on $udid." >&2
    return 0
  fi
  [ "${E2E_KEEP_XCTEST_RECORDINGS:-}" = "1" ] && mode="keep"
  [ "${E2E_ATTACHMENTS_REAP_DRY_RUN:-}" = "1" ] && mode="dry-run"
  if [ "$mode" != "delete" ]; then
    echo "🧹 INFRA-692 ($mode): this run's XCTest recordings on $udid, NOT deleted:" >&2
    printf '%s\n' "$new" | sed 's/^/      /' >&2
    return 0
  fi
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    size="$(wc -c <"$f" 2>/dev/null | tr -d ' ')"
    if rm -f -- "$f" 2>/dev/null && [ ! -e "$f" ]; then
      removed=$((removed + 1))
      bytes=$((bytes + ${size:-0}))
    else
      failed=$((failed + 1))
    fi
  done <<EOF_NEW
$new
EOF_NEW
  echo "🧹 INFRA-692: removed $removed XCTest recording(s), $((bytes / 1048576)) MB, written by this run on $udid." >&2
  [ "$failed" -gt 0 ] && echo "⚠️  INFRA-692: $failed recording(s) could not be removed; left in place." >&2
  return 0
}
