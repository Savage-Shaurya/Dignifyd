"use client";

import { useEffect, useRef } from "react";

export type AuroraProps = {
  colorStops: [string, string, string];
  amplitude: number;
  blend: number;
  speed: number;
  frequency: number;
  verticalScale: number;
  verticalOffset: number;
  originY: number;
  bandHalfWidth: number;
  opacity: number;
};

const VERT = `#version 300 es
in vec2 position; void main(){ gl_Position = vec4(position, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform float uTime, uAmplitude, uBlend, uFrequency, uVerticalScale, uVerticalOffset, uOriginY, uBandHalfWidth;
uniform vec3 uColorStops[3]; uniform vec2 uResolution; out vec4 fragColor;
vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){ const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx); vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod(i,289.0);
  vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.0*dot(m,g); }
struct ColorStop{ vec3 color; float position; };
#define COLOR_RAMP(colors,factor,finalColor){ int index=0; for(int i=0;i<2;i++){ ColorStop c=colors[i]; bool b=c.position<=factor; index=int(mix(float(index),float(i),float(b))); } ColorStop c0=colors[index]; ColorStop c1=colors[index+1]; float range=c1.position-c0.position; float lf=(factor-c0.position)/range; finalColor=mix(c0.color,c1.color,lf); }
void main(){
  vec2 uv=gl_FragCoord.xy/uResolution;
  ColorStop colors[3]; colors[0]=ColorStop(uColorStops[0],0.0); colors[1]=ColorStop(uColorStops[1],0.5); colors[2]=ColorStop(uColorStops[2],1.0);
  vec3 rampColor; COLOR_RAMP(colors,uv.x,rampColor);
  float height=snoise(vec2(uv.x*uFrequency+uTime*0.1, uTime*0.25))*0.5*uAmplitude;
  height=exp(height);
  float falloff=max(0.0,1.0-abs(uv.y-uOriginY)/uBandHalfWidth);
  height=(falloff*uVerticalScale-height+uVerticalOffset);
  float intensity=0.6*height;
  float midPoint=0.20;
  float auroraAlpha=smoothstep(midPoint-uBlend*0.5, midPoint+uBlend*0.5, intensity);
  vec3 auroraColor=intensity*rampColor;
  fragColor=vec4(auroraColor*auroraAlpha, auroraAlpha); }`;

const hex = (h: string) => {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Aurora band; every prop eases toward its target (k = 1 - e^(-2dt)), so state changes cross-fade.
export default function Aurora(props: AuroraProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const target = useRef(props);
  const wake = useRef<() => void>(() => {});

  useEffect(() => {
    target.current = props;
    wake.current();
  });

  useEffect(() => {
    const w = wrap.current;
    if (!w) return;
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    w.appendChild(canvas);
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!gl) {
      // No WebGL: soft CSS band in the same colours, cross-faded with the same opacity targets.
      canvas.remove();
      const [c0, c1] = target.current.colorStops;
      w.style.background = `radial-gradient(60% 22% at 50% 50%, ${c1}66 0%, ${c0}55 45%, transparent 75%)`;
      w.style.transition = "opacity 1.4s ease-out";
      wake.current = () => {
        w.style.opacity = String(target.current.opacity);
      };
      wake.current();
      return () => {
        w.style.background = "";
      };
    }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = {
      time: U("uTime"),
      amp: U("uAmplitude"),
      blend: U("uBlend"),
      freq: U("uFrequency"),
      vs: U("uVerticalScale"),
      vo: U("uVerticalOffset"),
      oy: U("uOriginY"),
      bw: U("uBandHalfWidth"),
      stops: U("uColorStops"),
      res: U("uResolution"),
    };

    const t0 = target.current;
    const cur = {
      amplitude: t0.amplitude,
      blend: t0.blend,
      speed: t0.speed,
      frequency: t0.frequency,
      verticalScale: t0.verticalScale,
      verticalOffset: t0.verticalOffset,
      originY: t0.originY,
      bandHalfWidth: t0.bandHalfWidth,
      opacity: 0,
      colors: t0.colorStops.flatMap(hex),
    };
    let time = 0;
    let last = performance.now();
    const start = last;
    let raf = 0;
    let running = false;
    let visible = true;

    const resize = () => {
      canvas.width = w.offsetWidth;
      canvas.height = w.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(w);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = target.current;
      const k = 1 - Math.exp(-2 * dt);
      (["amplitude", "blend", "speed", "frequency", "verticalScale", "verticalOffset", "originY", "bandHalfWidth", "opacity"] as const).forEach((key) => {
        cur[key] += (t[key] - cur[key]) * k;
      });
      const tc = t.colorStops.flatMap(hex);
      cur.colors = cur.colors.map((v, i) => v + (tc[i] - v) * k);
      time += dt * cur.speed * 0.1;
      const amp = cur.amplitude * (1 + 0.26 * Math.sin(((now - start) / 1000 / 5) * Math.PI * 2));
      w.style.opacity = String(cur.opacity);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(u.time, time);
      gl.uniform1f(u.amp, amp);
      gl.uniform1f(u.blend, cur.blend);
      gl.uniform1f(u.freq, cur.frequency);
      gl.uniform1f(u.vs, cur.verticalScale);
      gl.uniform1f(u.vo, cur.verticalOffset);
      gl.uniform1f(u.oy, cur.originY);
      gl.uniform1f(u.bw, cur.bandHalfWidth);
      gl.uniform3fv(u.stops, cur.colors);
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (t.opacity < 0.001 && cur.opacity < 0.01) {
        running = false;
        w.style.opacity = "0";
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    const sync = () => {
      const want = visible && !document.hidden && (target.current.opacity > 0.001 || cur.opacity > 0.01);
      if (want && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      } else if (!want && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    };
    wake.current = sync;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(w);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    };
  }, []);

  return <div ref={wrap} style={{ width: "100%", height: "100%", opacity: 0 }} aria-hidden />;
}
