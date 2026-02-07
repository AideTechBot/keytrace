import { jsx, jsxs } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { useState, useEffect } from "react";
function App() {
  const [session, setSession] = useState(null);
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/oauth/session").then((res) => res.json()).then((data) => {
      setSession(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const handleLogin = (e) => {
    e.preventDefault();
    if (handle) {
      window.location.href = `/oauth/login?handle=${encodeURIComponent(handle)}`;
    }
  };
  const handleLogout = async () => {
    await fetch("/oauth/logout", { method: "POST" });
    setSession({ authenticated: false });
  };
  if (loading) {
    return /* @__PURE__ */ jsx("div", { children: "Loading..." });
  }
  return /* @__PURE__ */ jsxs("div", { style: { padding: "2rem", fontFamily: "system-ui" }, children: [
    /* @__PURE__ */ jsx("h1", { children: "keytrace.dev" }),
    (session == null ? void 0 : session.authenticated) ? /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }, children: [
        session.avatar && /* @__PURE__ */ jsx(
          "img",
          {
            src: session.avatar,
            alt: "",
            style: { width: 48, height: 48, borderRadius: "50%" }
          }
        ),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: "bold" }, children: session.displayName || session.handle }),
          /* @__PURE__ */ jsxs("div", { style: { color: "#666" }, children: [
            "@",
            session.handle
          ] }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", color: "#999" }, children: session.did })
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: handleLogout, children: "Logout" })
    ] }) : /* @__PURE__ */ jsxs("form", { onSubmit: handleLogin, children: [
      /* @__PURE__ */ jsx("p", { children: "Sign in with your Bluesky handle:" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          value: handle,
          onChange: (e) => setHandle(e.target.value),
          placeholder: "you.bsky.social",
          style: { padding: "0.5rem", marginRight: "0.5rem" }
        }
      ),
      /* @__PURE__ */ jsx("button", { type: "submit", children: "Login with Bluesky" })
    ] })
  ] });
}
async function render(_url) {
  return renderToString(/* @__PURE__ */ jsx(App, {}));
}
export {
  render
};
//# sourceMappingURL=entry-server.js.map
