
import { setReconnecter } from "./core/state.js";
import { connect } from "./net/router.js";
import { boucleDeRendu } from "./render/world.js";

import "./ui/dom.js";
import "./render/stage.js";
import "./net/interp.js";
import "./render/fx.js";
import "./render/decor.js";
import "./render/actors.js";
import "./render/boss.js";
import "./ui/build.js";
import "./ui/screens.js";
import "./ui/pause.js";
import "./input.js";
import "./ui/boot.js";
import "./net/ingest.js";

setReconnecter(connect);

requestAnimationFrame(boucleDeRendu);
