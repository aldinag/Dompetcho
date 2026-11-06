import fs from 'fs';
import path from 'path';
import { APP_VERSION } from '../appInfo';

describe('APP_VERSION', () => {
  it('matches versionName in android/app/build.gradle', () => {
    const buildGradlePath = path.join(__dirname, '../../../android/app/build.gradle');
    const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
    const match = buildGradle.match(/versionName\s+"([^"]+)"/);

    expect(match).not.toBeNull();
    expect(APP_VERSION).toBe(match?.[1]);
  });
});
