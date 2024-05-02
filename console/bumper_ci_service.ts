import { BumperService } from "https://raw.githubusercontent.com/drashland/services/master/ci/bumper_service.ts";
import { bumperFiles } from "./bumper_ci_service_files.ts";

const b = new BumperService("sinco", Deno.args);

if (!b.isForPreRelease()) {
  b.bump(bumperFiles);
}
