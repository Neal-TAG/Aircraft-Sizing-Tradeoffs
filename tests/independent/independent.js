const fs=require('fs');
const KT=1.688,RHO=0.002377,G=32.2,UDE=50;
const cases=JSON.parse(fs.readFileSync('cases.json','utf8'));
function sigmaF(h){return h<=36089?Math.pow(1-6.8756e-6*h,4.2559):0.29708*Math.exp(-(h-36089)/20806);}
function model(c,tolStop=true){
  const o={};
  const CLa=2*Math.PI*c.AR/(2+Math.sqrt(4+c.AR*c.AR/0.9025));
  const q=0.5*RHO*(c.V*KT)**2, b=Math.sqrt(c.AR*c.S), ch=c.S/b, WS=c.W/c.S;
  o.Vs=Math.sqrt(2*c.W/(RHO*c.S*c.CLmax))/KT; o.b=b; o.WS=WS;
  o.We=c.fe*c.W+c.ws*c.S; o.U=c.W-o.We; o.q=q;
  o.Dp=q*c.S*c.CD0; o.Di=c.W*c.W/(q*Math.PI*b*b*c.e); o.D=o.Dp+o.Di; o.LD=c.W/o.D;
  const K=1/(Math.PI*c.AR*c.e); o.LDmax=0.5/Math.sqrt(c.CD0*K);
  o.Vmd=Math.sqrt(2*WS/RHO*Math.sqrt(K/c.CD0))/KT;
  const mu=2*WS/(RHO*ch*CLa*G), Kg=0.88*mu/(5.3+mu);
  o.n=1+Kg*UDE*c.V*CLa/(498*WS);
  o.sigma=sigmaF(c.h); const Vt=c.V/Math.sqrt(o.sigma); o.VTAS=Vt;
  const a=q*c.S*c.CD0, bb=1/(q*Math.PI*b*b*c.e);
  const Dw=w=>a+bb*w*w;
  const ff=w=>c.prop==='prop'?c.cp*Dw(w)*Vt*KT/(550*c.eta):c.ct*Dw(w);
  o.ff0=ff(c.W*(1-c.fc));
  const Jf=(w1,w2)=>(Math.atan(w1*Math.sqrt(bb/a))-Math.atan(w2*Math.sqrt(bb/a)))/Math.sqrt(a*bb);
  const Rf=J=>c.prop==='prop'?550*c.eta/(KT*c.cp)*J:Vt/c.ct*J;
  function mission(P,F){
    const T=o.We+P+F, Fc=c.fc*T, w1=T-Fc;
    let Fr=0;
    for(let i=0;i<(tolStop?20:500);i++){const n=c.tr/60*ff(o.We+P+Fr); const d=Math.abs(n-Fr); Fr=n; if(tolStop&&d<0.01)break;}
    const w2=o.We+P+Fr, Fcr=F-Fc-Fr;
    const R=Fcr<=0?0:Rf(Jf(w1,w2));
    return {payload:P,fuel:F,T,reserve:Fr,cruise:Fcr,range:R,w1,w2};
  }
  o._ff=ff;o._Dw=Dw;o._Jf=Jf;o._Rf=Rf;o._Vt=Vt;o._a=a;o._b=bb;
  const U=o.U;
  if(U<=0){const z={payload:0,fuel:0,T:0,reserve:0,cruise:0,range:0};o.A=o.B=o.C=o.D=z;o.noDiagram=true;return o;}
  const pB=Math.min(c.Pmax,U);
  o.A=mission(pB,0);
  o.B=mission(pB,Math.min(c.Fmax,U-pB));
  o.C=mission(Math.min(c.Pmax,U-Math.min(c.Fmax,U)),Math.min(c.Fmax,U));
  o.D=mission(0,Math.min(c.Fmax,U));
  return o;
}
const out={},extra={};
let worst=0,worstId='';
const simpson=(f,a,b,n)=>{const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=f(a+i*h)*(i%2?4:2);return s*h/3;};
const chk1=[],chk2=[],conv=[];
for(const c of cases){
  const o=model(c), oc=model(c,false);
  const rec={};
  for(const k of ['Vs','b','WS','We','U','q','Dp','Di','D','LD','LDmax','Vmd','n','sigma','VTAS','ff0'])rec[k]=o[k];
  for(const p of 'ABCD')if(o[p]){const{payload,fuel,T,reserve,cruise,range}=o[p];rec[p]={payload,fuel,takeoffWeight:T,reserve,cruiseFuel:cruise,range};}
  out[c.id]=rec;
  // check1
  for(const p of 'ABCD'){const m=o[p]; if(!(m.range>0))continue;
    const f=w=>o._Vt/o._ff(w);
    const num=simpson(f,m.w2,m.w1,2000);
    const rel=Math.abs(num-m.range)/m.range; chk1.push({id:c.id,p,closed:m.range,num,rel});
    if(rel>worst){worst=rel;worstId=c.id+p;}}
  // check2
  const w1=0.995*c.W*(1-c.fc)*1, w1b=c.W*(1-c.fc), w2b=0.99*w1b, wm=(w1b+w2b)/2;
  const J=o._Jf(w1b,w2b), Jb=(w1b-w2b)/o._Dw(wm);
  chk2.push({id:c.id,rel:Math.abs(J-Jb)/J});
  conv.push({id:c.id,dR:['B','C','D'].map(p=>o[p].range?Math.abs(o[p].range-oc[p].range):0)});
}
fs.writeFileSync('expected.json',JSON.stringify(out,null,1));
console.log('worst integ rel diff',worst,worstId);
console.log('cases integrated',chk1.length);
console.log('check2',chk2.map(x=>x.id+':'+x.rel.toExponential(2)).join('  '));
console.log('stop-tol vs converged range diff (nmi)',JSON.stringify(conv));
// check3
console.log('sigma 36089-',sigmaF(36089),'36089+',0.29708*Math.exp(0),'sigma 10k',sigmaF(10000),'35k',sigmaF(35000),'51k',sigmaF(51000),'36090',sigmaF(36090));
console.log('const',550/1.688, 'ratio',(550/1.688)/325.8);
for(const c of cases){const r=out[c.id];console.log(c.id,'U',r.U.toFixed(1),'B',r.B.payload.toFixed(1),r.B.fuel.toFixed(1),r.B.range.toFixed(1),'C',r.C.payload.toFixed(1),r.C.fuel.toFixed(1),r.C.range.toFixed(1),'D',r.D.payload.toFixed(1),r.D.fuel.toFixed(1),r.D.range.toFixed(1),'Fcr A/B/C/D',['A','B','C','D'].map(p=>r[p].cruiseFuel.toFixed(0)).join('/'),'ff0',r.ff0.toFixed(1),'LD',r.LD.toFixed(2),'sig',r.sigma.toFixed(4),'Vs',r.Vs.toFixed(1),'Vmd',r.Vmd.toFixed(1),'n',r.n.toFixed(2));}
