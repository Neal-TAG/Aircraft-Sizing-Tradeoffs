const fs=require('fs');
const KT=1.688,RHO=0.002377,G=32.2,UDE=50,A0=661.48,NM=6076.12,IDLE=0.10;
const cases=JSON.parse(fs.readFileSync('cases.json','utf8'));
const sigmaF=h=>h<=36089?Math.pow(1-6.8756e-6*h,4.2559):0.29708*Math.exp(-(h-36089)/20806);
const thetaF=h=>h<=36089?1-6.8756e-6*h:0.751863;
function build(c){
  const o={};const m={};
  const CLa=2*Math.PI*c.AR/(2+Math.sqrt(4+c.AR*c.AR/0.9025));
  const q=0.5*RHO*(c.V*KT)**2,b=Math.sqrt(c.AR*c.S),ch=c.S/b,WS=c.W/c.S;
  const sg=sigmaF(c.h),th=thetaF(c.h),Vt=c.V/Math.sqrt(sg),a=A0*Math.sqrt(th),M=Vt/a;
  const dCD=M>c.Mcrit?20*Math.pow(M-c.Mcrit,4):0;
  const We=c.fe*c.W+c.ws*c.S,U=c.W-We;
  const Dp=q*c.S*c.CD0,Dc=q*c.S*dCD,k2=1/(q*Math.PI*c.AR*c.S*c.e),k0=Dp+Dc;
  const D=k0+k2*c.W*c.W;
  const K=1/(Math.PI*c.AR*c.e);
  const mu=2*WS/(RHO*ch*CLa*G),Kg=0.88*mu/(5.3+mu);
  const sizing={Vs:Math.sqrt(2*c.W/(RHO*c.S*c.CLmax))/KT,b,WS,We,U,q,Dp,Dc,Di:c.W*c.W*k2,D,LD:c.W/D,
    LDmax:0.5/Math.sqrt(c.CD0*K),Vmd:Math.sqrt(2*WS/RHO*Math.sqrt(K/c.CD0))/KT,
    n:1+Kg*UDE*c.V*CLa/(498*WS)};
  const Dw=w=>k0+k2*w*w;
  const ff=w=>c.prop==='prop'?c.cp*Dw(w)*Vt*KT/(550*c.eta):c.ct*Dw(w);
  const ff0=ff(c.W*(1-c.ft));
  // climb
  const hasClimb=c.h>0&&c.roc>0;
  const Vc=c.V/Math.sqrt(sigmaF(c.h/2));
  const climb=wc=>{if(!hasClimb)return{F:0,X:0,Fdrag:0};
    const tc=c.h/c.roc,Dcl=Dp+k2*wc*wc;let ffc,Fdrag;
    if(c.prop==='prop'){const P=(Dcl*Vc*KT+wc*c.roc/60)/(550*c.eta);ffc=c.cp*P;Fdrag=c.cp*(Dcl*Vc*KT)/(550*c.eta)*tc/60;}
    else{const T=Dcl+wc*(c.roc/60)/(Vc*KT);ffc=c.ct*T;Fdrag=c.ct*Dcl*tc/60;}
    return{F:ffc*tc/60,X:Vc*tc/60,Fdrag};};
  const descent=w2=>{if(c.h<=0)return{F:0,X:0};
    const Gr=w2/(Dp+k2*w2*w2),X=c.h*Gr/NM,td=X/Vc;return{F:IDLE*ff(w2)*td,X};};
  const Jf=(w1,w3)=>{const r=Math.sqrt(k2/k0);return(Math.atan(w1*r)-Math.atan(w3*r))/Math.sqrt(k0*k2);};
  const Rf=J=>c.prop==='prop'?550*c.eta/(KT*c.cp)*J:Vt/c.ct*J;
  function mission(P,F){
    const T=We+P+F,Ft=c.ft*T,wc=T-Ft,cl=climb(wc),w1=wc-cl.F;
    let Fr=0;for(let i=0;i<50;i++){const n=c.tr/60*ff(We+P+Fr),d=Math.abs(n-Fr);Fr=n;if(d<0.01)break;}
    const w2=We+P+Fr,de=descent(w2),w3=w2+de.F,Fcr=w1-w3;
    let Rcr=0,Rng=0;if(Fcr>0){Rcr=Rf(Jf(w1,w3));Rng=cl.X+Rcr+de.X;}
    return{payload:P,fuel:F,takeoffWeight:T,taxiFuel:Ft,climbFuel:cl.F,climbDist:cl.X,reserve:Fr,descentFuel:de.F,descentDist:de.X,cruiseFuel:Fcr,cruiseDist:Rcr,range:Rng,
      _w1:w1,_w2:w2,_w3:w3,_wc:wc,_Fdrag:cl.Fdrag};
  }
  // best range
  const wb=c.W*(1-c.ft);
  const obj=V=>{const qq=0.5*RHO*(V*KT)**2,vt=V/Math.sqrt(sg),mm=vt/a,dc=mm>c.Mcrit?20*Math.pow(mm-c.Mcrit,4):0;
    const k2v=1/(qq*Math.PI*c.AR*c.S*c.e);const d=qq*c.S*(c.CD0+dc)+wb*wb*k2v;
    return c.prop==='prop'?d:d/vt;}; // minimise
  const lo=Math.max(40,1.1*sizing.Vs),hi=500;
  let best=lo,bv=Infinity,bi=0;for(let i=0;i<=400;i++){const V=lo+(hi-lo)*i/400,v=obj(V);if(v<bv){bv=v;best=V;bi=i;}}
  let x1=lo+(hi-lo)*Math.max(bi-1,0)/400,x2=lo+(hi-lo)*Math.min(bi+1,400)/400;
  const gr=(Math.sqrt(5)-1)/2;let c1=x2-gr*(x2-x1),c2=x1+gr*(x2-x1),f1=obj(c1),f2=obj(c2);
  while(x2-x1>0.01){if(f1<f2){x2=c2;c2=c1;f2=f1;c1=x2-gr*(x2-x1);f1=obj(c1);}else{x1=c1;c1=c2;f1=f2;c2=x1+gr*(x2-x1);f2=obj(c2);}}
  const Vbest=(x1+x2)/2;
  const brute=()=>{let bV=null,bvv=Infinity;for(let k=0;;k++){const V=1+k*0.01;if(V>500.0000001)break;if(V<lo)continue;const v=obj(V);if(v<bvv){bvv=v;bV=V;}}return bV;};
  const PL=c.WL-We-c.tr/60*ff(c.WL),Pstar=Math.max(0,Math.min(c.Pmax,PL));
  const pts={};
  if(U<=0){const z={payload:0,fuel:0,takeoffWeight:0,taxiFuel:0,climbFuel:0,climbDist:0,reserve:0,descentFuel:0,descentDist:0,cruiseFuel:0,cruiseDist:0,range:0};for(const p of 'ABCD')pts[p]=z;}
  else{const pB=Math.min(Pstar,U),Fm=Math.min(c.Fmax,U);
    pts.A=mission(pB,0);pts.B=mission(pB,Math.min(c.Fmax,U-pB));pts.C=mission(Math.min(Pstar,U-Fm),Fm);pts.D=mission(0,Fm);}
  return{sizing,atmosphere:{sigma:sg,theta:th,VTAS:Vt,a,M,dCD},ff0,PL,Pstar,Vbest,points:pts,_ff:ff,_Vt:Vt,_brute:brute,_We:We,_Fr:null};
}
const out={},simpson=(f,a,b,n)=>{const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=f(a+i*h)*(i%2?4:2);return s*h/3;};
let worst=0,wid='',n1=0;const c2=[],c3=[],c4=[],landing=[];
for(const c of cases){
  const r=build(c);const rec={sizing:r.sizing,atmosphere:r.atmosphere,ff0:r.ff0,PL:r.PL,Pstar:r.Pstar,Vbest:r.Vbest,points:{}};
  for(const p of 'ABCD'){const o={};for(const k in r.points[p])if(k[0]!=='_')o[k]=r.points[p][k];rec.points[p]=o;}
  out[c.id]=rec;
  for(const p of 'ABCD'){const m=r.points[p];
    if(m.range>0&&m._w1!==undefined){const num=simpson(w=>r._Vt/r._ff(w),m._w3,m._w1,2000);const rel=Math.abs(num-m.cruiseDist)/m.cruiseDist;n1++;if(rel>worst){worst=rel;wid=c.id+p;}}
    if(c.prop==='prop'&&m.climbFuel>0){const exp=c.cp*m._wc*c.h/(550*c.eta*3600);c4.push({id:c.id,p,diff:(m.climbFuel-m._Fdrag)-exp,exp});}
    if(m._w2!==undefined&&m._w2>c.WL+1e-6)landing.push(c.id+p+':'+m._w2.toFixed(1));
  }
  // check 2
  const cc={...c,Mcrit:5},r2=build(cc);const wbk=c.W*(1-c.ft);
  const Vmd_wb=r2.sizing.Vmd*Math.sqrt(1-c.ft),Vmd_W=r2.sizing.Vmd;
  const expv=(c.prop==='prop'?1:Math.pow(3,0.25))*Vmd_wb;
  c2.push({id:c.id,prop:c.prop,Vbest:r2.Vbest,exp_wb:expv,d_wb:r2.Vbest-expv,d_W:r2.Vbest-(c.prop==='prop'?1:Math.pow(3,0.25))*Vmd_W,lo:Math.max(40,1.1*r2.sizing.Vs)});
  c3.push({id:c.id,gs:r.Vbest,bf:r._brute(),d:r.Vbest-r._brute()});
  // PL consistency: mission at P=PL
  if(r.PL>0&&r.sizing.U>0){}
}
fs.writeFileSync('expected.json',JSON.stringify(out,null,1));
console.log('1 worst',worst,wid,'n',n1);
console.log('2');c2.forEach(x=>console.log(x.id,x.prop,x.Vbest.toFixed(3),x.exp_wb.toFixed(3),'d_wb',x.d_wb.toFixed(4),'d_W',x.d_W.toFixed(4),'lo',x.lo.toFixed(1)));
console.log('3');c3.forEach(x=>console.log(x.id,x.gs.toFixed(3),x.bf.toFixed(2),x.d.toFixed(4)));
console.log('4');c4.forEach(x=>console.log(x.id,x.p,x.diff.toExponential(2),x.exp.toFixed(3)));
console.log('landing>WL',landing);
console.log('table');
for(const c of cases){const r=out[c.id];console.log(c.id,c.prop,'U',r.sizing.U.toFixed(0),'PL',r.PL.toFixed(0),'P*',r.Pstar.toFixed(0),'M',r.atmosphere.M.toFixed(3),'dCD',r.atmosphere.dCD.toFixed(5),'Vb',r.Vbest.toFixed(2),'Vmd',r.sizing.Vmd.toFixed(1),'B',r.points.B.payload.toFixed(0),r.points.B.range.toFixed(1),'C',r.points.C.payload.toFixed(0),r.points.C.range.toFixed(1),'D',r.points.D.range.toFixed(1),'Fcr',['A','B','C','D'].map(p=>r.points[p].cruiseFuel.toFixed(0)).join('/'));}
