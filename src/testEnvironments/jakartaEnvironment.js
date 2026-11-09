// A node test environment pinned to WIB (Asia/Jakarta, UTC+7) so a test can exercise the
// "device in a non-UTC timezone" case for real, instead of only passing because the CI host
// happens to run in UTC. Scoped to one test file via its `@jest-environment` docblock pragma
// — setting `process.env.TZ` from inside a test only changes a sandboxed copy of `process`
// (see jest-environment-node), too late for V8's Date cache, so it has to happen here, before
// the vm context (and its Date) is created.
const NodeEnvironment = require('jest-environment-node').TestEnvironment;

const previousTZ = process.env.TZ;

class JakartaEnvironment extends NodeEnvironment {
  constructor(config, context) {
    process.env.TZ = 'Asia/Jakarta';
    super(config, context);
  }

  async teardown() {
    process.env.TZ = previousTZ;
    await super.teardown();
  }
}

module.exports = JakartaEnvironment;
