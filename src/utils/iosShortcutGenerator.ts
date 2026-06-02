// iOS Shortcut generator — produces an unsigned XML `.shortcut` plist that
// users can install on iOS / iPadOS / macOS Shortcuts. Goal id + API key +
// endpoint URL are baked in; the user only types title and description when
// they run the shortcut.
//
// To install unsigned shortcuts, iOS users need to enable
// Settings → Shortcuts → Advanced → Allow Untrusted Shortcuts (this option
// only appears after running at least one signed shortcut from iCloud).

export type ShortcutMode = "completed" | "pending";

export interface ShortcutOptions {
  /** The shortcut's display name in the user's library. */
  name: string;
  /** Full POST endpoint URL — e.g. https://dailygoalmap.vercel.app/api/project-tasks */
  endpoint: string;
  /** Project API key secret (dgm_...) baked into the request header. */
  apiKey: string;
  /** Goal id baked in (used by the server-side endpoint to scope the row). */
  goalId: string;
  /** Goal title — shown in the success notification only. */
  goalTitle: string;
  /** Whether tasks created by this shortcut start completed or pending. */
  mode: ShortcutMode;
}

// Helpers ───────────────────────────────────────────────────────────────────

const PLACEHOLDER = "￼"; // Object replacement character used by Apple
                              // Shortcuts to mark a magic-variable insertion.

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uuid(): string {
  // Browser-friendly UUID generator.
  return crypto.randomUUID
    ? crypto.randomUUID().toUpperCase()
    : ("xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      })).toUpperCase();
}

/**
 * Build a `WFTextTokenString` dict that interpolates `attachments` as magic
 * variables into the literal template `text`. Placeholder positions are read
 * from the indexes of U+FFFC characters in `text`.
 */
function textWithAttachments(
  text: string,
  attachments: Array<{ outputUUID: string; outputName: string }>
): string {
  // Map each U+FFFC index → attachment
  const indexes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === PLACEHOLDER) indexes.push(i);
  }
  if (indexes.length !== attachments.length) {
    throw new Error(
      `textWithAttachments: ${indexes.length} placeholders but ${attachments.length} attachments`
    );
  }

  const attachmentsXml = indexes
    .map(
      (idx, i) => `
            <key>{${idx}, 1}</key>
            <dict>
              <key>Type</key><string>ActionOutput</string>
              <key>OutputUUID</key><string>${escapeXml(attachments[i].outputUUID)}</string>
              <key>OutputName</key><string>${escapeXml(attachments[i].outputName)}</string>
            </dict>`
    )
    .join("");

  return `
    <dict>
      <key>Value</key>
      <dict>
        <key>string</key>
        <string>${escapeXml(text)}</string>
        <key>attachmentsByRange</key>
        <dict>${attachmentsXml}
        </dict>
      </dict>
      <key>WFSerializationType</key>
      <string>WFTextTokenString</string>
    </dict>`;
}

/** Build a `WFTextTokenString` dict for a plain literal string (no attachments). */
function literalText(text: string): string {
  return `
    <dict>
      <key>Value</key>
      <dict>
        <key>string</key>
        <string>${escapeXml(text)}</string>
      </dict>
      <key>WFSerializationType</key>
      <string>WFTextTokenString</string>
    </dict>`;
}

/** Build an action dict. */
function action(identifier: string, parameters: string): string {
  return `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>${identifier}</string>
      <key>WFWorkflowActionParameters</key>
      <dict>${parameters}
      </dict>
    </dict>`;
}

// Generator ─────────────────────────────────────────────────────────────────

export function buildShortcutPlist(opts: ShortcutOptions): string {
  const titleUUID = uuid();
  const descUUID = uuid();
  const completedBool = opts.mode === "completed";

  // 1. Ask for Title
  const askTitle = action(
    "is.workflow.actions.ask",
    `
        <key>WFAskActionPrompt</key>
        <string>${escapeXml("Task title")}</string>
        <key>WFInputType</key>
        <string>Text</string>
        <key>CustomOutputName</key>
        <string>Title</string>
        <key>UUID</key>
        <string>${titleUUID}</string>`
  );

  // 2. Ask for Description (allow multi-line, optional)
  const askDesc = action(
    "is.workflow.actions.ask",
    `
        <key>WFAskActionPrompt</key>
        <string>${escapeXml("Description (optional — leave blank if none)")}</string>
        <key>WFInputType</key>
        <string>Text</string>
        <key>WFAskActionAllowsMultipleLines</key>
        <true/>
        <key>WFAskActionDefaultAnswer</key>
        <string></string>
        <key>CustomOutputName</key>
        <string>Description</string>
        <key>UUID</key>
        <string>${descUUID}</string>`
  );

  // 3. Get Contents of URL (POST JSON) ─ goal_id + completed + is_anytime baked in
  const headersDict = `
        <key>WFHTTPHeaders</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>WFDictionaryFieldValueItems</key>
            <array>
              <dict>
                <key>WFItemType</key><integer>0</integer>
                <key>WFKey</key>${literalText("X-Project-Api-Key")}
                <key>WFValue</key>${literalText(opts.apiKey)}
              </dict>
              <dict>
                <key>WFItemType</key><integer>0</integer>
                <key>WFKey</key>${literalText("Content-Type")}
                <key>WFValue</key>${literalText("application/json")}
              </dict>
            </array>
          </dict>
          <key>WFSerializationType</key>
          <string>WFDictionaryFieldValue</string>
        </dict>`;

  // Build JSON body items: title (string w/ Title var), description (string w/ Description var),
  // is_anytime (true), completed (baked).
  const bodyItems = `
            <array>
              <dict>
                <key>WFItemType</key><integer>0</integer>
                <key>WFKey</key>${literalText("title")}
                <key>WFValue</key>${textWithAttachments(PLACEHOLDER, [
                  { outputUUID: titleUUID, outputName: "Provided Input" },
                ])}
              </dict>
              <dict>
                <key>WFItemType</key><integer>0</integer>
                <key>WFKey</key>${literalText("description")}
                <key>WFValue</key>${textWithAttachments(PLACEHOLDER, [
                  { outputUUID: descUUID, outputName: "Provided Input" },
                ])}
              </dict>
              <dict>
                <key>WFItemType</key><integer>4</integer>
                <key>WFKey</key>${literalText("is_anytime")}
                <key>WFValue</key>
                <dict>
                  <key>Value</key><true/>
                  <key>WFSerializationType</key><string>WFNumberSubstitutableState</string>
                </dict>
              </dict>
              <dict>
                <key>WFItemType</key><integer>4</integer>
                <key>WFKey</key>${literalText("completed")}
                <key>WFValue</key>
                <dict>
                  <key>Value</key>${completedBool ? "<true/>" : "<false/>"}
                  <key>WFSerializationType</key><string>WFNumberSubstitutableState</string>
                </dict>
              </dict>
            </array>`;

  const jsonValuesDict = `
        <key>WFJSONValues</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>WFDictionaryFieldValueItems</key>${bodyItems}
          </dict>
          <key>WFSerializationType</key>
          <string>WFDictionaryFieldValue</string>
        </dict>`;

  const postAction = action(
    "is.workflow.actions.downloadurl",
    `
        <key>WFHTTPMethod</key>
        <string>POST</string>
        <key>ShowHeaders</key>
        <true/>
        <key>WFURL</key>
        <string>${escapeXml(opts.endpoint)}</string>
        ${headersDict}
        <key>WFHTTPBodyType</key>
        <string>JSON</string>
        ${jsonValuesDict}`
  );

  // 4. Show Notification (success message)
  const notifyAction = action(
    "is.workflow.actions.notification",
    `
        <key>WFNotificationActionTitle</key>
        <string>${escapeXml("Orbit")}</string>
        <key>WFNotificationActionBody</key>
        <string>${escapeXml(
          `${completedBool ? "Logged a completed task in " : "Added a pending task to "}${opts.goalTitle}`
        )}</string>
        <key>WFNotificationActionSound</key>
        <true/>`
  );

  const actionsXml = [askTitle, askDesc, postAction, notifyAction].join("");

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowActions</key>
  <array>${actionsXml}
  </array>
  <key>WFWorkflowClientVersion</key>
  <string>2607.0.5</string>
  <key>WFWorkflowIcon</key>
  <dict>
    <key>WFWorkflowIconStartColor</key>
    <integer>463338751</integer>
    <key>WFWorkflowIconGlyphNumber</key>
    <integer>59511</integer>
  </dict>
  <key>WFWorkflowImportQuestions</key>
  <array/>
  <key>WFWorkflowInputContentItemClasses</key>
  <array/>
  <key>WFWorkflowMinimumClientVersion</key>
  <integer>900</integer>
  <key>WFWorkflowMinimumClientVersionString</key>
  <string>900</string>
  <key>WFWorkflowName</key>
  <string>${escapeXml(opts.name)}</string>
  <key>WFWorkflowTypes</key>
  <array>
    <string>NCWidget</string>
    <string>WatchKit</string>
  </array>
</dict>
</plist>
`;

  return plist;
}

/** Trigger a browser download of the generated `.shortcut` file. */
export function downloadShortcut(opts: ShortcutOptions): void {
  const xml = buildShortcutPlist(opts);
  const blob = new Blob([xml], { type: "application/x-apple-shortcut" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // iOS recognizes `.shortcut` extension and prompts to import.
  const safeName = opts.name.replace(/[^a-z0-9_\- ]/gi, "_").trim() || "Orbit";
  a.download = `${safeName}.shortcut`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
