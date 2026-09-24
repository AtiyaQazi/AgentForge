export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function layout(title: string, body: string, nav = true): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b1020">
  <title>${escapeHtml(title)} · AgentForge</title>

  <style>
    :root {
      color-scheme: dark;

      --bg: #080c16;
      --bg-secondary: #0d1322;
      --surface: #111827;
      --surface-hover: #172033;
      --border: #263149;
      --border-soft: #1c2638;

      --text: #f4f7fb;
      --text-secondary: #c2cada;
      --muted: #7f8ba3;

      --accent: #7c5cff;
      --accent-hover: #9278ff;
      --accent-soft: rgba(124, 92, 255, 0.14);

      --success: #35c98a;
      --danger: #ff5c72;
      --warning: #f5b84b;

      --radius: 10px;
      --radius-small: 7px;
    }

    * {
      box-sizing: border-box;
    }

    html {
      background: var(--bg);
    }

    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(
          circle at 15% 0%,
          rgba(124, 92, 255, 0.10),
          transparent 30%
        ),
        radial-gradient(
          circle at 90% 10%,
          rgba(53, 201, 138, 0.05),
          transparent 25%
        ),
        var(--bg);

      color: var(--text);
      font-family:
        Inter,
        ui-sans-serif,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      max-width: 1180px;
      margin: 0 auto;
      padding: 32px 24px 60px;
      line-height: 1.6;
    }

    ::selection {
      background: var(--accent);
      color: white;
    }

    a {
      color: var(--text-secondary);
      text-decoration: none;
      transition:
        color 0.15s ease,
        opacity 0.15s ease;
    }

    a:hover {
      color: white;
    }

    nav {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 32px;
      padding: 10px;
      background: rgba(17, 24, 39, 0.82);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(12px);
    }

    nav::before {
      content: "AgentForge";
      margin-right: auto;
      padding: 8px 12px;
      color: white;
      font-weight: 800;
      letter-spacing: -0.02em;
      font-size: 1rem;
    }

    nav a {
      padding: 8px 12px;
      border-radius: var(--radius-small);
      font-size: 0.92rem;
      font-weight: 600;
    }

    nav a:hover {
      background: var(--accent-soft);
      color: white;
    }

    nav form {
      margin-left: 4px;
    }

    h1,
    h2,
    h3 {
      color: var(--text);
      line-height: 1.2;
      letter-spacing: -0.025em;
    }

    h1 {
      margin: 0 0 24px;
      font-size: clamp(1.8rem, 4vw, 2.5rem);
    }

    h2 {
      margin-top: 32px;
    }

    p {
      color: var(--text-secondary);
    }

    label {
      display: block;
      margin-bottom: 6px;
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 600;
    }

    input,
    textarea,
    button,
    select {
      font: inherit;
      box-sizing: border-box;
    }

    input,
    textarea,
    select {
      width: 100%;
      margin-bottom: 16px;
      padding: 11px 13px;
      color: var(--text);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-small);
      outline: none;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;
    }

    input::placeholder,
    textarea::placeholder {
      color: var(--muted);
    }

    input:focus,
    textarea:focus,
    select:focus {
      border-color: var(--accent);
      background: var(--bg-secondary);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }

    textarea {
      min-height: 260px;
      resize: vertical;
      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        monospace;
      line-height: 1.6;
    }

    button {
      cursor: pointer;
      padding: 10px 16px;
      color: white;
      background: var(--accent);
      border: 1px solid var(--accent);
      border-radius: var(--radius-small);
      font-weight: 700;
      transition:
        background 0.15s ease,
        border-color 0.15s ease,
        transform 0.15s ease;
    }

    button:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }

    button[type="submit"] {
      min-width: 90px;
    }

    table {
      width: 100%;
      margin-top: 16px;
      border-collapse: separate;
      border-spacing: 0;
      overflow: hidden;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    th,
    td {
      text-align: left;
      padding: 13px 14px;
      border-bottom: 1px solid var(--border-soft);
    }

    th {
      color: var(--text-secondary);
      background: var(--bg-secondary);
      font-size: 0.82rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    td {
      color: var(--text-secondary);
    }

    tr:last-child td {
      border-bottom: 0;
    }

    tbody tr {
      transition: background 0.15s ease;
    }

    tbody tr:hover {
      background: var(--surface-hover);
    }

    .status {
      display: inline-block;
      padding: 3px 9px;
      color: var(--text-secondary);
      background: var(--accent-soft);
      border: 1px solid var(--border);
      border-radius: 999px;
      font-size: 0.78em;
      font-weight: 700;
    }

    .row {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .muted {
      color: var(--muted);
      opacity: 1;
      font-size: 0.9em;
    }

    .danger {
      color: var(--danger);
    }

    form.inline {
      display: inline;
    }

    form.inline button {
      padding: 7px 11px;
      color: var(--text-secondary);
      background: transparent;
      border-color: var(--border);
      font-size: 0.88rem;
    }

    form.inline button:hover {
      color: white;
      background: var(--surface-hover);
      border-color: var(--accent);
    }

    code {
      padding: 3px 7px;
      color: #d9d2ff;
      background: var(--bg-secondary);
      border: 1px solid var(--border-soft);
      border-radius: 5px;
      font-family:
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Monaco,
        Consolas,
        monospace;
      font-size: 0.9em;
    }

    pre {
      padding: 16px;
      overflow-x: auto;
      color: var(--text-secondary);
      background: #070b13;
      border: 1px solid var(--border);
      border-radius: var(--radius);
    }

    hr {
      height: 1px;
      margin: 28px 0;
      border: 0;
      background: var(--border);
    }

    .card {
      padding: 20px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
    }

    @media (max-width: 700px) {
      body {
        padding: 20px 14px 40px;
      }

      nav {
        align-items: stretch;
        flex-wrap: wrap;
      }

      nav::before {
        width: 100%;
        margin-right: 0;
        padding: 4px 8px 8px;
      }

      nav a {
        flex: 1;
        text-align: center;
      }

      nav form {
        flex: 1;
      }

      nav form button {
        width: 100%;
      }

      table {
        display: block;
        overflow-x: auto;
        white-space: nowrap;
      }
    }
  </style>
</head>

<body>
  ${
    nav
      ? `<nav>
    <a href="/posts">Posts</a>
    <a href="/posts/new">New post</a>
    <a href="/account">Account</a>
    <form class="inline" method="post" action="/logout">
      <button type="submit">Log out</button>
    </form>
  </nav>`
      : ''
  }

  ${body}
</body>
</html>`;
}