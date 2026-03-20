import type { TypeaheadItem } from "./typeahead-overlay.js";

import { loadSessions } from "../session-rollouts.js";
import TypeaheadOverlay from "./typeahead-overlay.js";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

type Props = {
  onView: (sessionPath: string) => void;
  onResume: (sessionPath: string) => void;
  onExit: () => void;
};

export default function SessionsOverlay({
  onView,
  onResume,
  onExit,
}: Props): JSX.Element {
  const [items, setItems] = useState<Array<TypeaheadItem>>([]);
  const [mode, setMode] = useState<"view" | "resume">("view");

  useEffect(() => {
    (async () => {
      const sessions = await loadSessions();
      const formatted = sessions.map((s) => {
        const ts = s.timestamp
          ? new Date(s.timestamp).toLocaleString(undefined, {
              dateStyle: "short",
              timeStyle: "short",
            })
          : "";
        const first = s.firstMessage?.slice(0, 50);
        const label = `${ts} · ${s.userMessages} msgs/${s.toolCalls} tools · ${first}`;
        return { label, value: s.path } as TypeaheadItem;
      });
      setItems(formatted);
    })();
  }, []);

  useInput((_input, key) => {
    if (key.tab) {
      setMode((m) => (m === "view" ? "resume" : "view"));
    }
  });

  return (
    <TypeaheadOverlay
      title={mode === "view" ? "View session" : "Resume session"}
      description={
        <Box flexDirection="column">
          <Text>
            {mode === "view" ? "press enter to view" : "press enter to resume"}
          </Text>
          <Text dimColor>tab to toggle mode · esc to cancel</Text>
        </Box>
      }
      initialItems={items}
      onSelect={(value) => {
        if (mode === "view") {
          onView(value);
        } else {
          onResume(value);
        }
      }}
      onExit={onExit}
    />
  );
}
