/**
 * FEAT-807: reads the last-export record on each focus without blocking render. The
 * screen renders nothing for it until the read resolves, and nothing on failure.
 *
 * `enabled` lets DeleteAccountScreen stop reading once an erasure starts: a read
 * initialises the encryption service, which would mint a new master key on a wiped
 * install (DEBUG-703 window).
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { readLastExportRecord, type LastExportRecord } from '../services/lastExportRecord';

export const useLastExportRecord = (
  enabled = true,
): [LastExportRecord | null, (record: LastExportRecord | null) => void] => {
  const [record, setRecord] = useState<LastExportRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      let cancelled = false;
      void readLastExportRecord().then((next) => {
        if (!cancelled) setRecord(next);
      });
      return () => {
        cancelled = true;
      };
    }, [enabled]),
  );

  return [record, setRecord];
};
