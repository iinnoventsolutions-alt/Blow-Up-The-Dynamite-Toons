import {BUILD_LABEL,PRODUCT_NAME} from './build-info';
export default function StartupSplash(){
 return <div className="startup-splash" aria-hidden="true"><div className="startup-splash-card"><img src="./innovent-icon.png" alt=""/><div className="startup-splash-name">{PRODUCT_NAME}</div><div className="startup-splash-tagline">Draw it. Arrange it. Bring it to life.</div><div className="startup-splash-version">{BUILD_LABEL}</div></div></div>;
}
