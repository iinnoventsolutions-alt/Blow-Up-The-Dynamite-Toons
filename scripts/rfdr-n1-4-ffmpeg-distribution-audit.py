#!/usr/bin/env python3
"""N1.4 read-only FFmpeg distribution and architecture feasibility audit."""
import json,os,pathlib,platform,re,shutil,subprocess
root=pathlib.Path('diagnostic-output');root.mkdir(exist_ok=True)
def command(args,required=True):
 p=subprocess.run(args,text=True,capture_output=True)
 if required and p.returncode:raise RuntimeError(f"{args}: {p.stderr}")
 return p.stdout.strip(),p.returncode
path=shutil.which('ffmpeg')
assert path,'FFmpeg not installed'
version,_=command([path,'-version'])
config,_=command([path,'-buildconf'])
encoders,_=command([path,'-encoders'])
architecture,_=command(['file',path])
lipo,_=command(['lipo','-archs',path],False)
signature,signature_code=command(['codesign','--verify','--verbose=2',path],False)
deps,_=command(['otool','-L',path])
brew,_=command(['brew','info','--json=v2','ffmpeg'])
formula=json.loads(brew)['formulae'][0]
flags=[line.strip() for line in config.splitlines() if '--enable-' in line or '--disable-' in line]
report={
 'checkpoint':'N1.4','status':'distribution_review_required',
 'runner_arch':platform.machine(),'binary_path':path,'binary_file':architecture,
 'binary_archs':lipo,'codesign_verify_exit':signature_code,
 'codesign_verify_output':signature,'brew_formula_license':formula.get('license'),
 'ffmpeg_version':version.splitlines()[0],
 'has_libvpx_encoder':'libvpx' in encoders,'has_libopus_encoder':'libopus' in encoders,
 'build_flags':flags,'has_gpl_flag':'--enable-gpl' in config,
 'has_nonfree_flag':'--enable-nonfree' in config,
 'dynamic_dependencies':deps.splitlines()[1:],
 'app_packaging':'package.json build.files has no FFmpeg binary or extraResources; bundled delivery NOT configured',
 'limitations':['Homebrew-installed binary is a runner prerequisite, not a distributable app artifact.',
                'Dynamic libraries, architecture slices, license notices, source-offer obligations and signing must be reviewed for a chosen redistributable build.',
                'Do not copy the Homebrew binary into production app without licensing and signing review.']
}
assert report['has_libvpx_encoder'] and report['has_libopus_encoder']
(root/'n1-4-distribution-audit.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:report[k] for k in ('runner_arch','binary_archs','brew_formula_license','has_gpl_flag','has_nonfree_flag','codesign_verify_exit','status')},indent=2))
print('N1.4 audit evidence collected; redistributable package NOT approved.')
