import {BUILD_LABEL,PRODUCT_NAME} from './build-info';
// Show the approved branded splash once per window session, not on reload/project switching.
const shouldShow = (() => {
 try {
  const key = 'iinnovent.splash-shown';
  if (sessionStorage.getItem(key) === '1') return false;
  sessionStorage.setItem(key, '1');
 } catch { /* Storage disabled: preserve the normal startup splash. */ }
 return true;
})();
export default function StartupSplash(){
 if (!shouldShow) return null;
 return <div className="startup-splash" aria-hidden="true"><div className="startup-splash-card"><img src="./innovent-icon.png" alt=""/><div className="startup-splash-name">{PRODUCT_NAME}</div><div className="startup-splash-tagline">Draw it. Arrange it. Bring it to life.</div><div className="startup-splash-version">{BUILD_LABEL}</div></div></div>;
}
