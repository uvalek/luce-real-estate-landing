import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Los reels se ven en el celular: 1080x1920 a calidad alta sin archivos enormes.
Config.setCrf(20);
