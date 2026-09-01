#!/usr/bin/env bash
#
# DEBUG-524 — AC 3 regression pin for the voice-journal audio abort.
#
# THE DEFECT
# Tapping `journal-record-button` enters ExpoSpeechRecognizer.prepareMicrophoneRecognition,
# which touches `AVAudioEngine.inputNode` synchronously on a Swift cooperative-pool thread.
# That drives AURemoteIO::Cleanup -> a blocking Mach RPC to the simulator's audio daemon;
# when it does not return, _ReportRPCTimeout calls abort(). The process dies roughly 15
# SECONDS after the tap, wherever the flow has got to by then.
#
# WHY THIS IS A SHELL PROBE AND NOT A MAESTRO ASSERTION
# The abort is time-based from the tap and mis-attributes itself to whatever step is
# executing when it lands — one observed run surfaced as a bare `Element not found` with no
# crash verdict at all. So the pin must (a) dwell past the deadline and (b) read an oracle
# that cannot be mistaken for a step failure. Maestro can do neither honestly: every in-flow
# dwell is either instant (`extendedWaitUntil: visible:` on an already-visible element),
# fails in both directions (`notVisible:` on a live element), or is host-speed dependent
# (`repeat:`), which makes a FASTER machine produce a WEAKER test.
#
# THE ORACLE IS THE PROCESS ID, sampled either side of an interval this script MEASURES
# rather than configures. A PID cannot be mis-attributed to an assertion, and — unlike any
# in-app element — it cannot be satisfied by a relaunch, because a new process gets a new
# PID. `journal-record-liveness.yaml` leaves the app in `phase: 'recording'` and asserts it,
# which is what licenses reading a MISSING pid as an abort rather than as a blind oracle.
#
# THIS MUST NEVER BE "FIXED" BY SHORTENING THE DWELL. A pass here means the process
# outlived the window; a shorter window means only that the harness outran the bug. That is
# the one closure DEBUG-524 explicitly forbids.
#
# EXIT CODES (deliberately the e2e-safety.sh alphabet)
#   0  the process survived a measured dwell past the abort deadline
#   1  REGRESSION — the process died inside the window (the defect)
#   2  the harness could not produce a verdict (no device, bad precondition, oracle blind)

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_ID="fyi.being.app"
FLOW="journal-record-liveness"

# 35s against an observed ~15s latency, measured 3/3. The floor is what the run is judged
# against; the sleep is merely how the floor is reached, so a slow host overshooting is
# harmless and a fast host cannot undershoot.
DWELL_S="${E2E_ABORT_DWELL_S:-35}"
MIN_DWELL_S="${E2E_ABORT_MIN_DWELL_S:-30}"

. "$SCRIPT_DIR/e2e-sim-device.sh"

fail_harness() { echo "❌ DEBUG-524 probe — $1" >&2; exit 2; }

# PID for a launchd label on the booted sim. Column 1 is the pid, column 3 the label;
# a non-running job prints `-` in column 1, which the numeric guard drops.
_launchctl_pid() {
  xcrun simctl spawn "$SIM_UDID" launchctl list 2>/dev/null \
    | awk -v pat="$1" 'index($3, pat) { print $1; exit }' \
    | grep -E '^[0-9]+$' || true
}

SIM_UDID="$(e2e_resolve_sim_device "DEBUG-524 audio liveness probe")" || exit 2
e2e_describe_sim_device "$SIM_UDID"

# ── POSITIVE CONTROL (crisis ruling 3.4) ─────────────────────────────────────────────
# An oracle that silently stops matching looks EXACTLY like a healthy app: no pid, or a
# parse that never fires, would otherwise read as "process gone" or be papered over. Prove
# the read works against a job that is always running on a booted sim BEFORE trusting it
# about ours. Without this the probe cannot tell "the app died" from "I cannot see pids".
CONTROL_PID="$(_launchctl_pid 'com.apple.SpringBoard')"
[ -n "$CONTROL_PID" ] \
  || fail_harness "oracle is blind: could not read a pid for com.apple.SpringBoard on $SIM_UDID. Refusing to report a verdict about $BUNDLE_ID from a read that does not work."
echo "✅ oracle control — SpringBoard pid $CONTROL_PID readable on $SIM_UDID"

# Attribution only, never the verdict: local .ips reports rotate and can be off entirely,
# so their absence proves nothing. Snapshot before so a new one can be named after.
DIAG_DIR="$HOME/Library/Logs/DiagnosticReports"
DIAG_BEFORE="$(ls "$DIAG_DIR" 2>/dev/null | grep -c '^Being' || true)"

# ── Establish the precondition ───────────────────────────────────────────────────────
# Routed through e2e-safety.sh, never `maestro test` — a bare invocation bypasses
# provenance verification, device resolution, the sim lock and the driver reset, which is
# precisely the hole INFRA-405 closed for the other per-flow scripts.
echo "▶️  driving to phase:'recording' via $FLOW"
bash "$SCRIPT_DIR/e2e-safety.sh" "$FLOW"
FLOW_RC=$?
[ "$FLOW_RC" -eq 0 ] \
  || fail_harness "could not establish the precondition ($FLOW exited $FLOW_RC). No window was opened, so there is no verdict about the audio path."

# ── The window ───────────────────────────────────────────────────────────────────────
T0="$(date +%s)"
PID_BEFORE="$(_launchctl_pid "$BUNDLE_ID")"
if [ -z "$PID_BEFORE" ]; then
  # The flow's final assertVisible proved the process was alive moments ago, and the control
  # above proved the read works — so an absent pid here is the abort landing early, not a
  # blind oracle.
  echo "❌ DEBUG-524 REGRESSION — $BUNDLE_ID was alive at the end of $FLOW and is gone before the dwell began." >&2
  echo "   The abort landed inside the flow's own tail. Check $DIAG_DIR for AURemoteIO::Cleanup / _ReportRPCTimeout." >&2
  exit 1
fi
echo "⏱️  dwelling ${DWELL_S}s from the record tap — app pid $PID_BEFORE"
sleep "$DWELL_S"

T1="$(date +%s)"
ELAPSED=$(( T1 - T0 ))
# The floor is asserted against MEASURED wall clock, not against DWELL_S. A configured
# timeout that returns early is the single failure mode this whole pin exists to exclude.
[ "$ELAPSED" -ge "$MIN_DWELL_S" ] \
  || fail_harness "dwell was ${ELAPSED}s, below the ${MIN_DWELL_S}s floor — the window was never open long enough to cross the ~15s abort deadline, so a pass would be meaningless."

PID_AFTER="$(_launchctl_pid "$BUNDLE_ID")"
DIAG_AFTER="$(ls "$DIAG_DIR" 2>/dev/null | grep -c '^Being' || true)"

if [ -z "$PID_AFTER" ]; then
  echo "❌ DEBUG-524 REGRESSION — $BUNDLE_ID died during a ${ELAPSED}s dwell after the record tap (was pid $PID_BEFORE)." >&2
  echo "   Being crash reports in $DIAG_DIR: ${DIAG_BEFORE} -> ${DIAG_AFTER}" >&2
  echo "   Expected stack: ExpoSpeechRecognizer.prepareMicrophoneRecognition -> AVAudioEngine.inputNode" >&2
  echo "                   -> AURemoteIO::Cleanup -> _ReportRPCTimeout -> abort()" >&2
  exit 1
fi

if [ "$PID_AFTER" != "$PID_BEFORE" ]; then
  # Someone reinstalled or relaunched under us. Not a pass: the process that survived is not
  # the process that entered the window.
  fail_harness "app pid changed under the probe ($PID_BEFORE -> $PID_AFTER). A relaunch cannot be read as survival; re-run with no peer gate active."
fi

echo "✅ DEBUG-524 — $BUNDLE_ID survived a measured ${ELAPSED}s dwell past the record tap (pid $PID_BEFORE unchanged)."
[ "$DIAG_AFTER" -gt "$DIAG_BEFORE" ] \
  && echo "⚠️  note: Being crash reports grew ${DIAG_BEFORE} -> ${DIAG_AFTER} during the run — a DIFFERENT crash may have occurred."
exit 0
