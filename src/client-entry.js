import { StandaloneThreeJSAdapter } from "@mml-io/mml-web-threejs-standalone";
import { NetworkedDOMWebsocket } from "@mml-io/networked-dom-web";

window.addEventListener("DOMContentLoaded", async () => {
  const container = document.createElement("div");
  container.style.cssText = "width:100vw;height:100vh;position:absolute;top:0;left:0;";
  document.body.appendChild(container);

  const mmlRoot = document.createElement("m-frame");
  mmlRoot.setAttribute("src", (location.protocol === "https:" ? "wss:" : "ws:") + "//" + location.host);
  container.appendChild(mmlRoot);

  await StandaloneThreeJSAdapter.create(container, {
    controlsType: 2,
    autoConnectRoot: true,
  });
});