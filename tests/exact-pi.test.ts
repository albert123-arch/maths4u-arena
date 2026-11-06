import test from "node:test";
import assert from "node:assert/strict";
import {checkExact,polynomialKey} from "../src/lib/exact-answer";
test("Pi is an exact constant in full angles, areas, points and interval endpoints",()=>{
 const number={key:"n",label:"Exact answer",type:"number",expected:"3*pi/2-sqrt(3)"};
 for(const raw of ["3π/2-√3","(6*pi-4*sqrt(3))/4",String.raw`\frac{3\pi}{2}-\sqrt{3}`])assert(checkExact(number,raw),raw);
 assert(!checkExact(number,"3*3.14/2-sqrt(3)"));
 assert(!checkExact({...number,expected:"pi"},"3.141592653589793"));
 assert(checkExact({...number,expected:"pi^2/4"},"(pi/2)^2"));
 assert(checkExact({key:"p",label:"Polar point",type:"pairs",expected:"(2*sqrt(3),pi/6);(2*sqrt(3),5*pi/6)"},"(sqrt(12),5π/6);(sqrt(12),π/6)"));
 const set={key:"s",label:"All allowed angles",type:"set",expected:"(-pi,-3*pi/4] U [-pi/4,pi/4] U [3*pi/4,pi]"};
 assert(checkExact(set,"[3π/4,π] U (-π,-3π/4] U [-π/4,π/4]"));
 assert(!checkExact(set,"[-π,-3π/4] U [-π/4,π/4] U [3π/4,π]"));
 assert(!checkExact(set,"[-pi/4,pi/4]"));
 assert(!checkExact({key:"i",label:"Integers",type:"integers",expected:"{3}"},"pi"));
});
test("Pi preserves existing polynomial keys and all bounded-parser protections",()=>{
 assert.deepEqual(polynomialKey("x^2+2*x*y+y^2",["x","y"]),polynomialKey("(x+y)^2",["x","y"]));
 assert.deepEqual(polynomialKey("sqrt(8)/2"),polynomialKey("sqrt(2)"));
 assert.deepEqual(polynomialKey("pi*(x+y)^2",["x","y"]),polynomialKey("pi*x^2+2*pi*x*y+pi*y^2",["x","y"]));
 for(const raw of ["pi^7","pi/(pi-pi)","sqrt(pi)","process.exit(0)","Math.PI","eval(1)","pi.constructor"]){
  assert.throws(()=>polynomialKey(raw),raw);
 }
});
