// 面部彩绘（逐像素）：眉、眼线、唇色、蝌蚪须、下巴须旋。
// 旧版用顶点色涂绘，分辨率受网格步长限制，细线全成了锯齿；这里在片元着色器里按头部局部坐标
// 解析地求到特征曲线的距离，配合 fwidth 抗锯齿，线条锐利且与网格精度无关。
import * as THREE from 'three';
import { CURVES } from './faceCurves.js';

const lin = (hex) => new THREE.Color(hex); // three 的 Color 以线性工作空间存储

const GLSL = /* glsl */ `
varying vec3 vFaceP;
uniform vec4 cBrow, cSlit, cMouth, cTop, cBot, cMus;
uniform vec3 uInk, uEye, uLip, uLipLine;
uniform float uSkinLum;
float cy(vec4 c, float x) { return c.x + x * (c.y + x * (c.z + x * c.w)); }
float cdy(vec4 c, float x) { return c.y + x * (2.0 * c.z + x * 3.0 * c.w); }
float cdist(vec4 c, float x, float y) { float s = cdy(c, x); return abs(y - cy(c, x)) / sqrt(1.0 + s * s); }
float aaFill(float d) { float w = fwidth(d) + 1e-6; return smoothstep(-w, w, d); }          // d>0 内部
float aaStroke(float d, float hw) { return aaFill(hw - d); }
`;

export function decalMaterial(base, spec) {
  const m = base.clone();
  const R = spec.R;
  const uniforms = {
    uDO: { value: new THREE.Vector3(...spec.o) },
    uDS: { value: spec.s },
    uDR: { value: new THREE.Matrix3().set(R[0], R[3], R[6], R[1], R[4], R[7], R[2], R[5], R[8]) },
    cBrow: { value: new THREE.Vector4(...CURVES.brow) },
    cSlit: { value: new THREE.Vector4(...CURVES.slit) },
    cMouth: { value: new THREE.Vector4(...CURVES.mouth) },
    cTop: { value: new THREE.Vector4(...CURVES.lipTop) },
    cBot: { value: new THREE.Vector4(...CURVES.lipBot) },
    cMus: { value: new THREE.Vector4(...CURVES.mustache) },
    uInk: { value: lin('#1c2238') },     // 石青黑：眉、须
    uEye: { value: lin('#0e0b09') },     // 眼线
    uLip: { value: lin('#c24a3e') },     // 朱唇
    uLipLine: { value: lin('#5a1a14') },
    uSkinLum: { value: spec.skinLum ?? 0.6 },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFaceP;\nuniform vec3 uDO;\nuniform float uDS;\nuniform mat3 uDR;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFaceP = uDR * ((position - uDO) / uDS);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + GLSL)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
      float paintA = 0.0;
      vec3 paintC = vec3(0.0);
      {
        vec3 P = vFaceP;
        float ax = abs(P.x);
        float front = smoothstep(0.12, 0.22, P.z);
        // 眉：细长新月，两端收尖，画在眉棱上沿
        float tb = clamp((ax - 0.035) / 0.29, 0.0, 1.0);
        float bw = 0.0062 * pow(sin(3.14159 * tb), 0.6) * (1.0 - 0.35 * tb);
        float brow = aaStroke(cdist(cBrow, ax, P.y - 0.0045), bw) * step(0.035, ax) * step(ax, 0.325);
        // 眼线：上睑缘一道墨线，外眼角延长上挑；眼缝内为深色
        float te = clamp((ax - 0.08) / 0.225, 0.0, 1.0);
        float ew = 0.0042 * (0.45 + 0.55 * pow(sin(3.14159 * min(te * 1.15, 1.0)), 0.5));
        float eye = aaStroke(cdist(cSlit, ax, P.y - 0.0036), ew) * step(0.08, ax) * step(ax, 0.302);
        eye = max(eye, aaStroke(cdist(cSlit, ax, P.y + 0.0015), 0.0058 * pow(sin(3.14159 * clamp((ax - 0.084) / 0.2, 0.0, 1.0)), 0.6) + 0.0012) * step(0.084, ax) * step(ax, 0.285));
        // 朱唇
        float xx = min(ax, 0.1);
        float lip = aaFill(cy(cTop, xx) - P.y) * aaFill(P.y - cy(cBot, xx)) * aaFill(0.1 - ax);
        float lipLine = aaStroke(cdist(cMouth, xx, P.y), 0.0024) * aaFill(0.104 - ax);
        // 蝌蚪须：唇上两撇，须尾下卷
        float tm = clamp((ax - 0.022) / 0.113, 0.0, 1.0);
        float mw = 0.0032 * pow(sin(3.14159 * tm), 0.7) + 0.0004;
        float mus = aaStroke(cdist(cMus, ax, P.y), mw) * step(0.022, ax) * step(ax, 0.135);
        vec2 q = vec2(ax - 0.136, P.y + 0.302);
        float ring = abs(length(q) - 0.0085);
        float ang = atan(q.y, q.x);
        mus = max(mus, aaStroke(ring, 0.0016) * step(ang, 1.2) * step(-2.6, ang));
        // 下巴须旋（如意形小卷）
        vec2 c = vec2(P.x - 0.002, P.y + 0.424);
        float cr = abs(length(c) - 0.011);
        float ca = atan(c.y, c.x);
        float chin = aaStroke(cr, 0.0022) * (1.0 - step(-0.9, ca) * step(ca, 0.6));
        chin = max(chin, aaStroke(abs(c.x - 0.004), 0.0018) * step(-0.036, c.y) * step(c.y, -0.012) * (1.0 - smoothstep(-0.03, -0.012, c.y) * 0.0));
        // 合成
        paintC = uLip; paintA = lip;
        paintC = mix(paintC, uLipLine, lipLine * lip);
        float ink = max(max(brow, mus), chin);
        paintC = mix(paintC, uInk, ink); paintA = max(paintA, ink);
        paintC = mix(paintC, uEye, eye); paintA = max(paintA, eye);
        paintA *= front;
        float ao = clamp(dot(vColor.rgb, vec3(0.3333)) / uSkinLum, 0.25, 1.15);
        diffuseColor.rgb = mix(diffuseColor.rgb, paintC * ao, paintA);
      }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, paintA);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, paintA);');
  };
  m.customProgramCacheKey = () => 'faceDecal|' + base.type;
  return m;
}
