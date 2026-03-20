import type { TypeaheadItem } from "./typeahead-overlay.js";

import { loadSessions } from "../session-rollouts.js";
import TypeaheadOverlay from "./typeahead-overlay.js";
import { Box, Text, useInput } from "ink";
import React, { useEffect, useState } from "react";

export type SessionSelectMode = "view" | "resume" | "fork";

type Props = {
  onView: (sessionPath: string) => void;
  onResume: (sessionPath: string) => void;
  onFork?: (sessionPath: string) => void;
  onExit: () => void;
  modes?: Array<SessionSelectMode>;
  initialMode?: SessionSelectMode;
};

export default function SessionsOverlay({
  onView,
  onResume,
  onFork,
  onExit,
  modes = ["view", "resume"],
  initialMode = "view",
}: Props): JSX.Element {
  const [items, setItems] = useState<Array<TypeaheadItem>>([]);
  const [mode, setMode] = useState<SessionSelectMode>(initialMode);

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
      setMode((m) => {
        const currentIndex = modes.indexOf(m);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % modes.length;
        return modes[nextIndex] ?? modes[0] ?? "view";
      });
    }
  });

  const titleByMode: Record<SessionSelectMode, string> = {
    view: "View session",
    resume: "Resume session",
    fork: "Fork session",
  };

  const actionByMode: Record<SessionSelectMode, string> = {
    view: "view",
    resume: "resume",
    fork: "fork",
  };

  return (
    <TypeaheadOverlay
      title={titleByMode[mode]}
      description={
        <Box flexDirection="column">
          <Text>
            {`press enter to ${actionByMode[mode]}`}
          </Text>
          <Text dimColor>
            {modes.length > 1 ? "tab to toggle mode · " : ""}
            esc to cancel
          </Text>
        </Box>
      }
      initialItems={items}
      onSelect={(value) => {
        if (mode === "view") {
          onView(value);
        } else if (mode === "resume") {
          onResume(value);
        } else {
          onFork?.(value);
        }
      }}
      onExit={onExit}
    />
  );
}
