import events from 'events';
import {
    getLogger
} from 'appium-logger';

const log = getLogger('UiAutomator2');

class UiAutomator2 extends events.EventEmitter {
	constructor(adb) {
		if (!adb) {
			log.errorAndThrow("adb is required to instantiate UiAutomator2");
		}
		super();
		this.adb = adb;        
		this.tempPath = "/data/local/tmp/";
	}

	async start(uiAutomator2ApkPath, uiautomator2TestApkPath, className, startDetector, ...extraParams) {
		let processIsAlive;
		try {
			log.debug("Starting UiAutomator2..");
			this.changeState(UiAutomator2.STATE_STARTING);

			log.debug("Parsing uiautomator2 apk");
			// expecting a path like /ads/ads/fsoo.apk or \asd\asd\foo.apk
			let apkName = this.parseApkNameFromPath(uiAutomator2ApkPath);
			let testApkName = this.parseApkNameFromPath(uiautomator2TestApkPath);
			log.debug("Installing  " + apkName + " and " + testApkName + " on to the device");
			await this.adb.install(uiAutomator2ApkPath);
			await this.adb.install(uiautomator2TestApkPath);
			log.debug("Sucessfully Installed " + apkName + " and " + testApkName + " on to the device");

			//killing any uiautomator2 existing processes
			await this.killUiAutomator2OnDevice();

			log.debug('Starting UIAutomator2');
			let args = ["shell", "am", "instrument", "-w", 'io.appium.uiautomator2.test/android.support.test.runner.AndroidJUnitRunner'];
			this.proc = this.adb.createSubProcess(args);
						
			await this.proc.start(startDetector);
			processIsAlive = true;
			this.changeState(UiAutomator2.STATE_ONLINE);
			return this.proc;
		} catch (e) {
			this.emit(UiAutomator2.EVENT_ERROR, e);
			if (processIsAlive) {
				await this.killUiAutomator2OnDevice();
				await this.proc.stop();
			}
			log.errorAndThrow(e);
		}
	}

	async shutdown() {
		log.debug('Shutting down UiAutomator2');
		this.changeState(UiAutomator2.STATE_STOPPING);
		await this.proc.stop();
		await this.killUiAutomator2OnDevice();
		this.changeState(UiAutomator2.STATE_STOPPED);
	}

	parseApkNameFromPath(binaryPath) {
		let reTest = /.*(\/|\\)(.*\.apk)/.exec(binaryPath);
		if (!reTest) {
			throw new Error(`Unable to parse apk name from ${binaryPath}`);
		}
		let apkName = reTest[2];
		log.debug(`Found apk name: '${apkName}'`);
		return apkName;
	}

	changeState(state) {
		log.debug(`Moving to state '${state}'`);
		this.state = state;
		this.emit(UiAutomator2.EVENT_CHANGED, {
			state
		});
	}

	async killUiAutomator2OnDevice() {
		try {
			await this.adb.killProcessesByName('uiautomator2');
		} catch (e) {
			log.warn(`Error while killing uiAutomator2: ${e}`);
		}
	}

}

UiAutomator2.EVENT_ERROR = 'uiautomator2_error';
UiAutomator2.EVENT_CHANGED = 'stateChanged';
UiAutomator2.STATE_STOPPED = 'stopped';
UiAutomator2.STATE_STARTING = 'starting';
UiAutomator2.STATE_ONLINE = 'online';
UiAutomator2.STATE_STOPPING = 'stopping';

export default UiAutomator2;