// The recall index the build script writes (scripts/build_data.py), loaded as JSON modules
// so the page, the bridge frame and the Node tests all read the same file the same way.
import RECORDS from "../data/recalls.json" with { type: "json" };
import META from "../data/meta.json" with { type: "json" };

export { RECORDS, META };
