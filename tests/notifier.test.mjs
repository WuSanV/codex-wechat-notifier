import assert from "node:assert/strict";
import test from "node:test";

import { activationRoute } from "../plugins/codex-wechat-notifier/scripts/lib/ilink.mjs";
import { formatNotification, handleStop } from "../plugins/codex-wechat-notifier/scripts/on-stop.mjs";

test("activationRoute falls back to the sender for an empty private-chat group id", () => {
  assert.deepEqual(
    activationRoute(
      { context_token: "context-1", from_user_id: "user-1", group_id: "" },
      "user-1",
    ),
    { context_token: "context-1", to_user_id: "user-1" },
  );
});

test("activationRoute keeps a non-empty group id", () => {
  assert.deepEqual(
    activationRoute(
      { context_token: "context-2", from_user_id: "user-1", group_id: "group-1" },
      "user-1",
    ),
    { context_token: "context-2", to_user_id: "group-1" },
  );
});

test("activationRoute rejects messages from another account", () => {
  assert.equal(
    activationRoute({ context_token: "context-3", from_user_id: "user-2" }, "user-1"),
    null,
  );
});

test("formatNotification includes project, model, and result", () => {
  const message = formatNotification({
    cwd: "/work/example-project",
    last_assistant_message: "All checks passed.",
    model: "gpt-5",
  });

  assert.match(message, /example-project/u);
  assert.match(message, /gpt-5/u);
  assert.match(message, /All checks passed\./u);
});

test("handleStop sends through the provided client without network access", async () => {
  let sent;
  const result = await handleStop(
    {
      cwd: "/work/example-project",
      hook_event_name: "Stop",
      last_assistant_message: "Finished.",
    },
    {
      account: {
        context_token: "context-4",
        to_user_id: "user-1",
        token: "unused-test-token",
      },
      client: {
        async sendText(payload) {
          sent = payload;
        },
      },
    },
  );

  assert.deepEqual(result, { sent: true });
  assert.equal(sent.contextToken, "context-4");
  assert.equal(sent.toUserId, "user-1");
  assert.match(sent.text, /Finished\./u);
});
