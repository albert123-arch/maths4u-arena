"""Independent Momentum teaching and complete quick checks; no source-book examples."""
import html
import sympy as s

R = s.Rational
lessons, models, questions, quick_models = [], [], [], []

def T(value):
    return s.latex(s.sympify(value))

def D(*rows):
    return r'\[\begin{gathered}' + r'\\'.join(rows) + r'\end{gathered}\]'

def impact(a, b, u, w, e):
    return s.simplify((a*u+b*w-b*e*(u-w))/(a+b)), s.simplify((a*u+b*w+a*e*(u-w))/(a+b))

def loss(a, b, u, w, e):
    return s.simplify(a*b*(1-e**2)*(u-w)**2/(2*(a+b)))

def E(code, title, question, reasoning, kind, inputs, values, labels):
    uid = 'MMOM-E-' + code
    solution = reasoning + '<p>Hence the complete result is</p>' + D(*(labels[k]+'='+T(v) for k,v in values.items()))
    models.append(dict(id=uid, kind=kind, inputs={k:str(v) for k,v in inputs.items()}, expected={k:str(v) for k,v in values.items()}, labels=labels))
    return dict(title=title, question=question, solution=solution, verification=uid)

def L(key, title, summary, objective, before, ideas, method, mistakes, examples):
    lessons.append(dict(key=key, id='fm_momentum_'+key, title=title, summary=summary, objective=objective,
        before=before, ideas=ideas, method='<ol>'+''.join('<li>'+v+'</li>' for v in method)+'</ol>', mistakes=mistakes, examples=examples))

base = '/courses/maths4u-9231-mechanics/topics/fm_momentum_'

L('direct', 'Signed impulse, direct impact and energy',
  'Use a signed momentum balance, identify the system and separate restitution from energy conservation.',
  'Determine every signed post-impact velocity and impulse, and test restitution and energy against the physical conditions.',
  '<p>Use signed components and exact fractions confidently. Review <a href="/courses/maths4u-9231-mechanics/topics/fm_projectiles_components">components and direction conventions</a>. Kinetic energy is one half of mass times speed squared; speed is the magnitude of velocity.</p>',
  r'''<h3>Momentum and impulse are vectors</h3><p>For a particle of constant mass, momentum is mass times velocity. The impulse of the resultant force equals the change in momentum. An impulse may reverse velocity even when its duration is very short.</p>'''
  + D(r'\mathbf p=m\mathbf v', r'\mathbf J=\int\mathbf F\,dt=m(\mathbf v-\mathbf u)', r'\mathbf F_{\rm mean}=\frac{\mathbf J}{\Delta t}')
  + r'''<p>State the positive direction before writing scalar components. If a velocity changes from +5 to −2, its change is −7, not −3. A negative impulse describes direction; its magnitude is positive.</p><h3>Choose the system before conserving momentum</h3><p>For two colliding particles, their contact impulses are equal and opposite. Adding their individual momentum changes cancels those internal impulses. Total momentum is conserved only in a direction where the external impulse on the chosen system is negligible. A wall exerts an external impulse on a sphere, so the sphere's normal momentum is not conserved.</p>'''
  + D(r'm_Au_A+m_Bu_B=m_Av_A+m_Bv_B')
  + r'''<h3>Restitution uses relative velocities</h3><p>In a direct impact put A to the left of B and take rightwards as positive. For an actual approaching contact, u_A−u_B&gt;0. The non-negative speed of separation is v_B−v_A. Newton's experimental law is</p>'''
  + D(r'v_B-v_A=e(u_A-u_B)', r'0\le e\le1')
  + r'''<p>Use the same signs in the momentum equation. Do not insert the two individual speeds into the restitution equation without checking their directions. Solving the two linear equations gives</p>'''
  + D(r'v_A=\frac{m_Au_A+m_Bu_B-m_Be(u_A-u_B)}{m_A+m_B}', r'v_B=\frac{m_Au_A+m_Bu_B+m_Ae(u_A-u_B)}{m_A+m_B}')
  + r'''<h3>Energy is a separate calculation</h3><p>Write the initial and final kinetic energies using squared signed velocities. Substituting the momentum and restitution results into their difference gives</p>'''
  + D(r'K_{\rm before}-K_{\rm after}=\frac{m_Am_B}{2(m_A+m_B)}(1-e^2)(u_A-u_B)^2')
  + r'''<p>The expression is non-negative for physical e. Only e=1 gives no loss in an actual impact with a positive approach speed. An individual sphere can gain kinetic energy while the pair loses energy. At e=0 the two direct post-impact velocities agree instantaneously; permanent attachment requires a separate physical assumption.</p><h3>Inverse observations must be admissible</h3><p>A statement that A rebounds is a sign condition on v_A, not merely a positive speed. Solve the observation together with the impact equations, then check 0≤e≤1, a positive approach speed and the stated direction. If no admissible value remains, explain that the observation is incompatible with this model.</p>''',
  ['Draw the pre-impact order and choose a positive direction.', 'Choose the system and state why its external impulse is negligible in the required direction.', 'Write signed momentum conservation and relative separation = e × relative approach.', 'Solve for every requested velocity, then obtain impulse from m(v−u).', 'Check the directions, the restitution interval and the total kinetic-energy change.'],
  ['Momentum uses signed velocities, whereas kinetic energy uses their squares.', 'Restitution relates relative velocities, not the speeds of one sphere alone.', 'A rebound means a reversal of direction.', 'A gain in one sphere’s energy need not be a gain for the pair.', 'An algebraic value of e outside [0,1] is not physical in this model.'], [
    E('D1','1 · A vector impulse and its mean force',r'<p>A 2 kg particle changes velocity from \((3,-1)\) to \((-1,5)\) m s⁻¹ during 0.3 s. Find both components of the impulse, its magnitude and both components of the mean resultant force.</p>',
      D(r'\mathbf J=2\bigl((-1,5)-(3,-1)\bigr)=(-8,12)', r'|\mathbf J|=\sqrt{(-8)^2+12^2}', r'\mathbf F_{\rm mean}=\frac{\mathbf J}{3/10}')+'<p>Retain the negative horizontal component. A force magnitude alone would not specify its direction.</p>',
      'vector_impulse',dict(m=2,ux=3,uy=-1,vx=-1,vy=5,dt=R(3,10)),
      dict(Jx=-8,Jy=12,J=s.sqrt(208),Fx=-R(80,3),Fy=40),dict(Jx='J_x',Jy='J_y',J=r'|\mathbf J|',Fx='F_x',Fy='F_y')),
    E('D2','2 · Two signed velocities and the loss of energy',r'<p>Sphere A, mass 2 kg, is to the left of sphere B, mass 3 kg, on a smooth line. Their approaching velocities are +7 and −1 m s⁻¹. The restitution coefficient is 1/2. Find both velocities after impact, the impulse on A and the total loss of kinetic energy.</p>',
      D(r'2v_A+3v_B=11',r'v_B-v_A=4')+'<p>Solve the two equations. A has a negative post-impact velocity, so it rebounds. The impulse on A is 2(v_A−7). The energy-loss formula uses the approach speed 8.</p>',
      'direct_impact',dict(a=2,b=3,u=7,w=-1,e=R(1,2)),dict(va=-R(1,5),vb=R(19,5),Ja=-R(72,5),lost=R(144,5)),dict(va='v_A',vb='v_B',Ja='J_A',lost=r'K_{\rm lost}')),
    E('D3','3 · A rebound interval and a stopping observation',r'<p>A 2 kg sphere A approaches a stationary 3 kg sphere B with velocity +6 m s⁻¹. Find the complete physical interval of e for which A rebounds. Also find e and B’s velocity when A is instantaneously at rest after impact.</p>',
      D(r'v_A=\frac{12-18e}{5}',r'v_B=\frac{12+12e}{5}',r'v_A\lt0\iff e\gt\frac23')+'<p>Intersect the strict rebound condition with 0≤e≤1: the interval is (2/3,1]. The boundary is a stop, not a rebound. Setting v_A=0 fixes that boundary value and then B’s velocity.</p>',
      'stop_observation',dict(a=2,b=3,u=6,w=0),dict(e=R(2,3),vb=4),dict(e=r'e_{\rm stop}',vb=r'v_{B,\rm stop}')),
    E('D4','4 · One sphere gains energy',r'<p>On a smooth line, a 1 kg sphere A approaches a 2 kg sphere B with signed velocities +6 and −1 m s⁻¹. The coefficient of restitution is 1/2. Find the post-impact velocities and compare the energy lost by A with the energy gained by B.</p>',
      D(r'v_A+2v_B=4',r'v_B-v_A=\frac72')+'<p>A loses 18−1/2=35/2 J. B gains 25/4−1=21/4 J. Thus the ratio of A’s loss to B’s gain is 10:3, and the total loss is their difference. Do not add a gain as though it were another loss.</p>',
      'energy_transfer',dict(a=1,b=2,u=6,w=-1,e=R(1,2)),dict(va=-1,vb=R(5,2),lossA=R(35,2),gainB=R(21,4),ratio=R(10,3),lost=R(49,4)),dict(va='v_A',vb='v_B',lossA='L_A',gainB='G_B',ratio=r'\frac{L_A}{G_B}',lost=r'K_{\rm lost}'))
  ])

L('surfaces','Smooth fixed surfaces and rebound geometry',
  'Resolve normal and tangential velocities; connect the rebound to angles, energy and the next flight.',
  'Apply a smooth-surface impulse to the normal component only and reconstruct the full post-impact motion.',
  '<p>Use the <a href="'+base+'direct">signed impulse and restitution equations</a>. Review dot products, unit vectors and <a href="/courses/maths4u-9231-mechanics/topics/fm_projectiles_trajectories">projectile trajectories</a>. A wall or ground is fixed in this model.</p>',
  r'''<h3>The contact geometry chooses the components</h3><p>Take a unit normal n pointing from the surface into the region accessible to the particle. An incoming velocity has u·n&lt;0. Smooth contact supplies no tangential impulse, so the tangential velocity stays unchanged. Restitution reverses and scales the normal component:</p>'''
  + D(r'u_n=\mathbf u\mathbin{\cdot}\mathbf n',r'v_n=-eu_n',r'\mathbf v=\mathbf u-(1+e)(\mathbf u\mathbin{\cdot}\mathbf n)\mathbf n')
  + r'''<p>This vector rule is useful for an inclined wall because its normal need not be a coordinate axis. Check that n has length one. Momentum of the particle in the normal direction changes: the fixed support supplies the impulse. Tangential momentum is conserved for the particle because that impulse has zero tangential component.</p><h3>Impulse and energy loss</h3>'''
  + D(r'\mathbf J=-m(1+e)u_n\mathbf n',r'K_{\rm lost}=\frac12m(1-e^2)u_n^2')
  + r'''<p>Only the normal component contributes to the loss. Squaring the full initial speed in the loss formula would incorrectly remove tangential energy. At e=0 the normal velocity becomes zero, but a nonzero tangential component remains: the particle need not stop.</p><h3>Angles need a named reference line</h3><p>If the incoming and outgoing paths make acute angles α and β with the surface, their tangent-to-normal components give</p>'''
  + D(r'\tan\alpha=\frac{|u_n|}{|u_t|}',r'\tan\beta=\frac{|v_n|}{|v_t|}=e\tan\alpha')
  + r'''<p>If the angles are measured from the normal, use the reciprocal ratios instead. Draw the outgoing direction before using a tangent. A perpendicular final path is a vector dot-product condition; a parallel final path is a determinant condition. These are conditions on whole velocity vectors.</p><h3>A rebound can start a new projectile stage</h3><p>At a smooth horizontal ground, the horizontal velocity is unchanged and the upward rebound velocity is e times the downward impact speed. Gravity acts over the following flight. With upward launch speed w and gravity g, solving y=wt−gt²/2 gives the next positive ground-contact time 2w/g and maximum height w²/(2g). A vertical velocity component is continuous during free flight but changes impulsively at contact.</p><h3>Find the first reachable surface</h3><p>For several surfaces, calculate each positive candidate contact time from the current position and velocity. Reject contacts outside a finite wall segment and contacts on its inaccessible side. Use the earliest physical event. If two contacts are simultaneous, a sequence of two separate single-wall models has not been justified; either exclude that case or supply an explicit multiple-contact model.</p>''',
  ['Choose a unit normal into the allowed region and a perpendicular unit tangent.', 'Resolve the incoming velocity and confirm that its normal component is negative.', 'Keep the tangential component; replace the normal component by −e times its old value.', 'Reconstruct both Cartesian components and calculate impulse or energy using the normal change.', 'Apply the next stage of motion only until its first reachable event.'],
  ['Smoothness preserves tangential velocity, not the whole velocity.', 'The particle’s normal momentum is not conserved at a fixed wall.', 'State whether an angle is measured from the surface or its normal.', 'e=0 does not stop a particle that still has tangential velocity.', 'Do not select an event at negative time or silently order simultaneous contacts.'],[
    E('F1','1 · A vertical wall changes one component',r'<p>A 2 kg particle approaches the wall x=0 from x&gt;0 with velocity \((-6,8)\) m s⁻¹. The wall is smooth and e=3/4. Find the outgoing velocity, impulse, speed and energy loss.</p>',
      '<p>The allowed-region normal is (1,0). The horizontal velocity becomes −(3/4)(−6)=9/2; the vertical component stays 8. Subtract the two complete velocities to find impulse.</p>',
      'wall_axis',dict(m=2,ux=-6,uy=8,e=R(3,4)),dict(vx=R(9,2),vy=8,Jx=21,Jy=0,speed=s.sqrt(337)/2,lost=R(63,4)),dict(vx='v_x',vy='v_y',Jx='J_x',Jy='J_y',speed=r'|\mathbf v|',lost=r'K_{\rm lost}')),
    E('F2','2 · An inclined wall in vector form',r'<p>The allowed side of a smooth fixed line has inward unit normal \(\mathbf n=(3/5,4/5)\). A 3 kg particle arrives with velocity \((-5,-5)\) m s⁻¹ and e=3/7. Find its outgoing velocity and impulse, and the energy lost.</p>',
      D(r'u_n=(-5)\frac35+(-5)\frac45=-7',r'\mathbf v=\mathbf u+10\mathbf n=(1,3)')+'<p>A unit tangent (−4/5,3/5) gives tangential velocity 1 both before and after impact. The change (6,8) is wholly normal to the line.</p>',
      'wall_tilt',dict(m=3,ux=-5,uy=-5,nx=R(3,5),ny=R(4,5),e=R(3,7)),dict(vx=1,vy=3,Jx=18,Jy=24,lost=60),dict(vx='v_x',vy='v_y',Jx='J_x',Jy='J_y',lost=r'K_{\rm lost}')),
    E('F3','3 · Recover restitution from the rebound speed',r'<p>A 4 kg particle approaches x=0 from the right with velocity \((-8,6)\) m s⁻¹. After smooth impact its speed is \(2\sqrt{13}\) m s⁻¹. Find e, both outgoing components and the energy loss; give the tangent of the acute outgoing angle β to the wall.</p>',
      D(r'v_x=8e,\qquad v_y=6',r'64e^2+36=52')+'<p>The admissible non-negative root is e=1/2. The outgoing angle is measured from the vertical wall, so tan β=v_x/|v_y|=2/3.</p>',
      'wall_inverse_speed',dict(m=4,ux=-8,uy=6,speed2=52),dict(e=R(1,2),vx=4,vy=6,tanBeta=R(2,3),lost=96),dict(e='e',vx='v_x',vy='v_y',tanBeta=r'\tan\beta',lost=r'K_{\rm lost}')),
    E('F4','4 · A ground rebound followed by free flight',r'<p>A particle of mass 1/2 kg strikes smooth horizontal ground with velocity \((4,-9)\) m s⁻¹, taking upward as positive. Let e=2/3 and g=10 m s⁻². Treat contact as instantaneous and neglect the impulse of gravity during it. Find its rebound velocity, the next flight time, maximum height, horizontal range and upward ground impulse.</p>',
      D(r'v_x=4,\qquad v_y=6',r'y=6t-5t^2',r'0=y\Longrightarrow t=0\ \hbox{or}\ t=\frac65')+'<p>The positive root is the next ground contact. The apex occurs at t=3/5. The ground impulse is the vertical momentum change; gravity over the subsequent flight is not part of this impact impulse.</p>',
      'ground_flight',dict(m=R(1,2),ux=4,down=9,e=R(2,3),g=10),dict(vx=4,vy=6,time=R(6,5),height=R(9,5),range=R(24,5),Jy=R(15,2)),dict(vx='v_x',vy='v_y',time='T',height='H',range='R',Jy='J_y'))
  ])

L('spheres','Oblique impacts between smooth spheres',
  'Apply the two-particle impact equations along the line of centres and preserve each tangential velocity separately.',
  'Recover complete outgoing velocity vectors and solve inverse impact conditions without losing the geometry.',
  '<p>Use <a href="'+base+'direct">direct-impact equations</a> and <a href="'+base+'surfaces">normal and tangential resolution</a>. Here both spheres can move, so use pair momentum along the contact normal rather than the fixed-wall rule.</p>',
  r'''<h3>The line of centres is the impulse direction</h3><p>At contact let n be a unit vector from A’s centre to B’s centre, and take t perpendicular to n. For smooth spheres the impulsive contact force acts along n. Each sphere therefore keeps its own tangential velocity; the two normal velocities obey the same momentum and restitution equations as a direct impact.</p>'''
  + D(r'u_{An}=\mathbf u_A\cdot\mathbf n,\qquad u_{Bn}=\mathbf u_B\cdot\mathbf n',r'm_Au_{An}+m_Bu_{Bn}=m_Av_{An}+m_Bv_{Bn}',r'v_{Bn}-v_{An}=e(u_{An}-u_{Bn})',r'v_{At}=u_{At},\qquad v_{Bt}=u_{Bt}')
  + r'''<p>The approach condition is u_An−u_Bn&gt;0. An algebraic restitution calculation does not establish that two spheres will actually meet: their centres must be at the contact separation, their paths must reach that configuration and their velocities must be approaching along n.</p><h3>Reconstruct the whole answer</h3>'''
  + D(r'\mathbf v_A=v_{An}\mathbf n+u_{At}\mathbf t',r'\mathbf v_B=v_{Bn}\mathbf n+u_{Bt}\mathbf t')
  + r'''<p>Reporting only v_An and v_Bn does not give the two outgoing velocities in the plane. The same basis must be used for both particles; reversing a tangent halfway through changes a sign. In Cartesian coordinates an equivalent update is v_A=u_A+(v_An−u_An)n, with the analogous expression for B.</p><h3>Impulse and kinetic energy</h3>'''
  + D(r'\mathbf J_A=m_A(v_{An}-u_{An})\mathbf n=-\mathbf J_B',r'K_{\rm lost}=\frac{m_Am_B}{2(m_A+m_B)}(1-e^2)(u_{An}-u_{Bn})^2')
  + r'''<p>The tangential energies cancel from the loss because neither tangential component changes. Thus a small normal approach speed can mean a small loss even when the spheres’ total speeds are large.</p><h3>Use vector conditions in inverse problems</h3><p>For perpendicular outgoing paths require v_A·v_B=0. For parallel nonzero outgoing paths require their two-dimensional determinant to vanish, then distinguish the same and opposite directions if needed. Solve the scalar condition together with 0≤e≤1, positive masses and the approaching-contact condition. Check each root in the original vector equations.</p><h3>Zero restitution is not automatic attachment</h3><p>When e=0 the normal relative velocity is zero immediately after impact. The tangential relative velocity can still be nonzero, so the two complete velocities need not agree. Do not replace the pair by one permanently joined body unless attachment is explicitly stated. These translational smooth-contact equations make no claim about spin or frictional impulses.</p>''',
  ['Identify the actual contact normal from the line of centres and choose a unit tangent.', 'Resolve both initial velocities and check the positive normal approach speed.', 'Solve pair momentum and restitution for the two signed normal velocities.', 'Keep each sphere’s tangential component and reconstruct all Cartesian components.', 'Apply any path constraint to the complete vectors; check e, geometry and energy.'],
  ['A smooth sphere’s tangential component stays with that sphere, not with the pair average.', 'The fixed-wall rule v_n=−eu_n does not apply to two movable spheres.', 'The relative normal approach speed differs from the magnitude of the relative velocity.', 'An inverse root must still lie in [0,1].', 'Equal normal velocities at e=0 do not imply equal full velocities or attachment.'],[
    E('B1','1 · An axis-aligned line of centres',r'<p>At contact A is to the left of B and the line of centres is horizontal. Their masses are 2 kg and 1 kg; the incoming velocities are \((6,3)\) and \((-2,-1)\) m s⁻¹. Let e=1/2. Find both complete outgoing velocities, the impulse on A and the total energy loss.</p>',
      D(r'2v_{Ax}+v_{Bx}=10',r'v_{Bx}-v_{Ax}=4',r'v_{Ay}=3,\qquad v_{By}=-1')+'<p>Resolve the contact impulse horizontally. The vertical components remain with their original spheres and are not averaged.</p>',
      'sphere_axis',dict(a=2,b=1,ux=6,uy=3,wx=-2,wy=-1,e=R(1,2)),dict(vax=2,vay=3,vbx=6,vby=-1,Ja=-8,lost=16),dict(vax='v_{Ax}',vay='v_{Ay}',vbx='v_{Bx}',vby='v_{By}',Ja='J_{Ax}',lost=r'K_{\rm lost}')),
    E('B2','2 · A tilted contact normal',r'<p>At contact the unit normal from a 1 kg sphere A towards a 2 kg sphere B is \((3/5,4/5)\). Their velocities before contact are \((7/5,26/5)\) and \((-3,1)\) m s⁻¹. Let e=1/2. Find both outgoing velocity vectors and the magnitude of A’s impulse.</p>',
      D(r'\mathbf t=(-4/5,3/5)',r'(u_{An},u_{At})=(5,2)',r'(u_{Bn},u_{Bt})=(-1,3)',r'v_{An}+2v_{Bn}=3',r'v_{Bn}-v_{An}=3')+'<p>The normal results are −1 and 2. Recombine them with tangential components 2 and 3. The impulse on A has normal component −6 and zero tangential component.</p>',
      'sphere_tilt',dict(a=1,b=2,nx=R(3,5),ny=R(4,5),un=5,ut=2,wn=-1,wt=3,e=R(1,2)),dict(vax=-R(11,5),vay=R(2,5),vbx=-R(6,5),vby=R(17,5),J=6,lost=9),dict(vax='v_{Ax}',vay='v_{Ay}',vbx='v_{Bx}',vby='v_{By}',J=r'|\mathbf J_A|',lost=r'K_{\rm lost}')),
    E('B3','3 · Perpendicular outgoing paths determine e',r'<p>Two equal 1 kg spheres touch with a horizontal line of centres, A to the left. Before impact their velocities are \((5,2)\) and \((0,-2)\) m s⁻¹. Find e if their outgoing paths are perpendicular, then give both outgoing velocities.</p>',
      D(r'v_{Ax}=\frac52(1-e),\qquad v_{Bx}=\frac52(1+e)',r'\mathbf v_A\cdot\mathbf v_B=\frac{25}{4}(1-e^2)-4=0')+'<p>The non-negative physical root is 3/5. Substitute it back before reporting the whole vectors. Their dot product is 1×4+2×(−2)=0.</p>',
      'sphere_perpendicular',dict(U=5,h=2),dict(e=R(3,5),vax=1,vay=2,vbx=4,vby=-2,lost=4),dict(e='e',vax='v_{Ax}',vay='v_{Ay}',vbx='v_{Bx}',vby='v_{By}',lost=r'K_{\rm lost}')),
    E('B4','4 · Equal normal velocities, different trajectories',r'<p>A 2 kg sphere A is to the left of a 3 kg sphere B at a horizontal contact. The incoming velocities are \((5,4)\) and \((0,-1)\) m s⁻¹ and e=0. Find both outgoing velocities and the energy loss. Do the smooth-sphere equations imply that they remain joined?</p>',
      D(r'v_{Ax}=v_{Bx}=\frac{2(5)+3(0)}5=2')+'<p>The tangential components stay 4 and −1. Thus the complete velocities differ; permanent joining does not follow. The tangential relative motion also means that equal instantaneous normal components must not be read as identical trajectories.</p>',
      'sphere_axis',dict(a=2,b=3,ux=5,uy=4,wx=0,wy=-1,e=0),dict(vax=2,vay=4,vbx=2,vby=-1,Ja=-6,lost=15),dict(vax='v_{Ax}',vay='v_{Ay}',vbx='v_{Bx}',vby='v_{By}',Ja='J_{Ax}',lost=r'K_{\rm lost}'))
  ])

L('successive','Successive impacts and deciding the next event',
  'Carry the current state from one event to the next, and distinguish finite stages from a limiting infinite sequence.',
  'Determine the chronological sequence of contacts and the complete post-impact states, with valid stopping or limiting conditions.',
  '<p>Use <a href="'+base+'direct">direct impacts</a>, <a href="'+base+'surfaces">wall impacts</a> and simple geometric series. Treat the particles as small point models for the stated separation calculations; finite sphere radii would require corresponding contact distances.</p>',
  r'''<h3>A fresh momentum equation at every contact</h3><p>For an isolated pair impact use the two particles that are actually touching. A third particle’s velocity is unchanged during that contact when it receives no impulse. The output velocities become the next stage’s input velocities. Do not conserve the pair’s kinetic energy unless that impact is perfectly elastic.</p><h3>Positions decide whether another contact occurs</h3><p>Between impacts, uniform trajectories have the form x_i=x_i0+v_i t. For two separated particles solve x_A=x_B for the next positive time. If A is behind B, A can catch it only if v_A&gt;v_B in that coordinate direction. Equal velocities with a positive gap keep that gap; a faster particle moving away cannot be caught.</p>'''
  + D(r'\Delta t=\frac{x_B-x_A}{v_A-v_B}\quad\hbox{when A is behind B and }v_A\gt v_B')
  + r'''<p>List all competing positive event times: another pair contact, a wall contact or a return to a named point. Select the earliest physically reachable event. A zero-time candidate may be the contact just processed, rather than another impact. Simultaneous three-body contacts are outside a sequence of separate two-body impact equations unless a model for them is supplied.</p><h3>A wall changes the state before the return journey</h3><p>First propagate both positions to the wall-impact time. Change the striking particle’s normal velocity using the wall’s restitution coefficient, then solve the new relative-motion problem. A relative speed calculated before the rebound is not the closing speed afterwards.</p><h3>Repeated rebounds give geometric sequences</h3><p>For vertical rebounds on smooth fixed horizontal ground with constant e in (0,1), let w be the upward velocity immediately after the current impact. The subsequent upward launch velocities are w, ew, e²w,…; their maximum heights have ratio e². The sum of all forthcoming flight times and the sum of vertical distances are</p>'''
  + D(r'T_\infty=\sum_{n=0}^{\infty}\frac{2we^n}{g}=\frac{2w}{g(1-e)}',r'S_\infty=\sum_{n=0}^{\infty}\frac{w^2e^{2n}}{g}=\frac{w^2}{g(1-e^2)}')
  + r'''<p>These are limits of an idealised infinite sequence. They do not mean that a particular finite bounce has zero speed. A physical model for settling is needed beyond the accumulation limit. At e=1 these series do not converge; at e=0 there is no upward next flight after a downward impact.</p><h3>Several fixed surfaces</h3><p>Apply the normal/tangential rule in each surface’s own basis. At perpendicular walls, each impact changes one Cartesian component, but the first wall still has to be determined from the geometry. Sum the separate impulses as vectors if a total impulse is requested. Momentum of the particle alone is not conserved across its contacts with the supports.</p>''',
  ['Record every current position, signed velocity and relevant restitution coefficient.', 'Calculate all positive candidate contact times and choose the first valid event.', 'Propagate every particle to that time, then solve only the actual impact.', 'Repeat with the new state; justify any claim that no further collision occurs.', 'For an infinite sequence, identify exactly what is being summed and state the admissible range of e.'],
  ['The next pair in the spatial order is not automatically the next pair to collide.', 'Propagate the other particle while one particle travels to a wall.', 'A zero-time solution may be the impact already processed.', 'Successive speeds scale by e, but successive rebound heights scale by e².', 'A limiting total time is not the time of a last finite bounce.'],[
    E('C1','1 · Two contacts, then a persistent gap',r'<p>Three equal 1 kg particles A, B and C lie on a smooth line. At time 0 A strikes B at x=0, while C is at rest at x=6 m. Just before the first impact A has velocity +8 m s⁻¹ and B is at rest. Let e_AB=1/2 and e_BC=1/3. Find the next contact time and all velocities just after it. Show whether A can catch B afterwards.</p>',
      D(r'v_A=2,\qquad v_B=6\quad\hbox{after the first impact}',r'\Delta t=6/6=1',r'x_A(1)=2,\qquad x_B(1)=x_C(1)=6')+'<p>During the second contact only B and C exchange impulse. Their outgoing velocities are 2 and 4. A and B then have equal velocities while separated by 4 m, so they do not meet again; C moves away faster.</p>',
      'three_chain',dict(U=8,d=6,e1=R(1,2),e2=R(1,3)),dict(time=1,position=6,va=2,vb=2,vc=4,gap=4),dict(time='T',position='x_{BC}',va='v_A',vb='v_B',vc='v_C',gap='d_{AB}')),
    E('C2','2 · A wall rebound creates a later meeting',r'<p>Immediately after separating at x=0, two equal 1 kg particles A and B have velocities +1 and +4 m s⁻¹ on a smooth line. A wall is at x=6 m and its restitution coefficient with B is 1/2. Find the time and position of their next mutual contact, measured from separation. Their mutual coefficient is 1/2; find both velocities immediately after that contact.</p>',
      D(r't_{\rm wall}=\frac64=\frac32',r'x_A(t_{\rm wall})=\frac32,\qquad v_B=-2',r'\Delta t=\frac{6-3/2}{1-(-2)}=\frac32')+'<p>The next contact therefore occurs at absolute time 3 and position 3. Use incoming velocities +1 and −2 in a fresh equal-mass impact. The calculation stops just after this contact; it does not assert that no future wall contact can occur.</p>',
      'wall_recollision',dict(a=1,b=4,L=6,ew=R(1,2),ep=R(1,2)),dict(twall=R(3,2),time=3,position=3,va=-R(5,4),vb=R(1,4)),dict(twall=r't_{\rm wall}',time='T',position='x_{AB}',va='v_A',vb='v_B')),
    E('C3','3 · A convergent ideal rebound sequence',r'<p>A ball is released from rest 5 m above smooth horizontal ground. Let g=10 m s⁻² and let every ground impact have e=1/2. Find the formal accumulation time measured from release, and the total distance in the idealised infinite sequence.</p>',
      D(r'U=\sqrt{2(10)(5)}=10,\qquad t_{\rm first}=1',r'w=5',r'T_\infty=1+\frac{2(5)}{10(1-1/2)}',r'S_\infty=5+\frac{5^2}{10(1-1/4)}')+'<p>The initial downward distance and initial fall time are counted once. Every later flight travels both upwards and downwards. The finite sum is a model limit, not the end of a numbered final bounce.</p>',
      'drop_bounces',dict(h=5,g=10,e=R(1,2)),dict(time=3,distance=R(25,3)),dict(time=r'T_\infty',distance=r'S_\infty')),
    E('C4','4 · Decide the first wall before changing components',r'<p>A 2 kg particle starts at (0,0) with velocity (6,8) m s⁻¹. It is confined by the smooth lines x=9 and y=8 to x≤9, y≤8. Both restitution coefficients are 1/2. Find the first two contact times, the position and velocity after the second contact, the combined impulse and the energy lost.</p>',
      D(r't_y=8/8=1,\qquad t_x=9/6=\frac32')+'<p>The horizontal wall is first. At time 1 the particle is at (6,8) and its velocity becomes (6,−4). It reaches x=9 after a further half-second, at (9,6), where the horizontal component changes to −3. The contacts are distinct; no corner rule is needed.</p>',
      'two_walls',dict(m=2,ux=6,uy=8,Lx=9,Ly=8,ex=R(1,2),ey=R(1,2)),dict(first=1,second=R(3,2),x=9,y=6,vx=-3,vy=-4,Jx=-18,Jy=-24,lost=75),dict(first='t_1',second='t_2',x='x_2',y='y_2',vx='v_x',vy='v_y',Jx='J_x',Jy='J_y',lost=r'K_{\rm lost}'))
  ])

def field(key, label, value, kind='number', options=None):
    return dict(key=key,label=label,type=kind,expected=str(value),**({'options':options} if options else {}))

def show(field):
    if field['type']=='choice':return html.escape(field['options'][field['expected']])
    if field['type']=='set':
        value=field['expected'];lo,hi=value[1:-1].split(',')
        return r'\(\left'+value[0]+T(lo)+','+T(hi)+r'\right'+value[-1]+r'\)'
    return r'\('+T(field['expected'])+r'\)'

hint = dict(direct='Choose a system and a positive direction. Use momentum and relative restitution, then check signs and e in [0,1].',
  surfaces='Take a unit normal into the allowed region. Keep the tangential velocity and reverse/scale only the normal velocity.',
  spheres='Resolve each velocity along the line of centres and a common unit tangent. Solve the two normal equations and reconstruct both vectors.',
  successive='Find the first positive contact time using the current positions and velocities. Update only the colliding bodies, then check the next possible event.')

def Q(lesson, code, family, variant, title, prompt, fields, reasoning, kind, inputs):
    uid=f'M4U-9231-MMOM-{code}{family}{variant}'
    questions.append(dict(id=uid,family_uid=f'M4U-9231-MMOM-{code}{family}',lesson=lesson,title=title,
      collection='short' if variant==1 else 'variant',prompt_html=prompt,
      answer_html='<p>'+'; '.join(html.escape(f['label'])+': '+show(f) for f in fields)+'</p>',
      solution_html=reasoning,hint_html='<p>'+hint[lesson]+'</p>',marks=len(fields),difficulty=2 if family<3 else 3,
      fields=fields,parts=[dict(label='',marking_criteria=[dict(code='A1',marks=1,description_html='<p>Give the complete correct '+html.escape(f['label'].lower())+'.</p>')for f in fields])],verification=uid))
    quick_models.append(dict(uid=uid,model=dict(kind=kind,inputs={k:str(v) for k,v in inputs.items()})))

for v,(a,b,u,w,e) in enumerate([(R(2),R(1),R(6),R(-3),R(1,3)),(R(3),R(2),R(8),R(-2),R(1,2))],1):
    va,vb=impact(a,b,u,w,e)
    Q('direct','D',1,v,'Both outgoing velocities, impulse and energy',
      '<p>At an approaching direct contact A is to the left of B. Rightwards is positive. Let '+rf'\(m_A={T(a)},\ m_B={T(b)}\) kg, \(u_A={T(u)},\ u_B={T(w)}\) m s⁻¹ and \(e={T(e)}\). Give both signed outgoing velocities, the signed impulse on A and the total energy loss.</p>',
      [field('va','Velocity of A in m per s',va),field('vb','Velocity of B in m per s',vb),field('Ja','Signed impulse on A in N s',a*(va-u)),field('lost','Total kinetic energy lost in J',loss(a,b,u,w,e))],
      '<p>Use the signed momentum total and v_B−v_A=e(u_A−u_B). The impulse is m_A(v_A−u_A); the loss uses the relative approach speed.</p>',
      'direct_impact',dict(a=a,b=b,u=u,w=w,e=e))

for v,(m,ux,uy,Jx,Jy,dt) in enumerate([(R(3,2),4,-2,-9,12,R(3,4)),(R(2),-1,3,10,-8,R(1,2))],1):
    Q('direct','D',2,v,'The whole velocity and mean force',
      rf'<p>A particle has mass \(m={T(m)}\) kg and initial velocity \(({T(ux)},{T(uy)})\) m s⁻¹. A resultant impulse \(({T(Jx)},{T(Jy)})\) N s acts during \({T(dt)}\) s. Give both final velocity components and both mean-force components.</p>',
      [field('vx','Final horizontal velocity',ux+Jx/m),field('vy','Final vertical velocity',uy+Jy/m),field('Fx','Mean horizontal force',Jx/dt),field('Fy','Mean vertical force',Jy/dt)],
      '<p>Apply m(v−u)=J to each component. Divide the complete impulse vector by the duration to get the mean force.</p>',
      'impulse_given',dict(m=m,ux=ux,uy=uy,Jx=Jx,Jy=Jy,dt=dt))

for v,(a,b,u,observed) in enumerate([(R(1),R(2),R(6),R(-1)),(R(2),R(3),R(5),-R(1,2))],1):
    threshold=a/b;e=s.solve(s.Eq((a*u-b*s.Symbol('e')*u)/(a+b),observed),s.Symbol('e'))[0];vb=impact(a,b,u,0,e)[1]
    Q('direct','D',3,v,'A complete physical rebound condition',
      rf'<p>A is to the left of stationary B at a direct contact. Let \(m_A={T(a)},\ m_B={T(b)}\) kg and \(u_A={T(u)}\) m s⁻¹. Give the full physical interval of e for A to rebound. For the observation \(v_A={T(observed)}\) m s⁻¹, also give e and B’s signed outgoing velocity.</p>',
      [field('interval','Complete restitution interval for rebound','('+str(threshold)+',1]','set'),field('e','Restitution for the observed velocity',e),field('vb','Signed velocity of B for that observation',vb)],
      '<p>A rebounds when v_A&lt;0. Intersect this strict condition with 0≤e≤1. Then use the signed measured v_A in the momentum and restitution equations.</p>',
      'rebound_inverse',dict(a=a,b=b,u=u,observed=observed))

for v,(m,ux,uy,e) in enumerate([(R(3),R(-8),R(6),R(1,2)),(R(2),R(-10),R(4),R(3,5))],1):
    vx=-e*ux;vy=uy
    Q('surfaces','F',1,v,'The complete wall rebound and impulse',
      rf'<p>A particle of mass \({T(m)}\) kg reaches x=0 from x&gt;0 with velocity \(({T(ux)},{T(uy)})\) m s⁻¹. The wall is smooth and \(e={T(e)}\). Give both outgoing velocity components, both impulse components and the energy lost.</p>',
      [field('vx','Outgoing horizontal velocity',vx),field('vy','Outgoing vertical velocity',vy),field('Jx','Horizontal impulse',m*(vx-ux)),field('Jy','Vertical impulse',0),field('lost','Energy lost',m*(1-e**2)*ux**2/2)],
      '<p>The normal is horizontal. Use v_x=−eu_x and v_y=u_y. The impulse is m(v−u); tangential energy is unchanged.</p>',
      'wall_axis',dict(m=m,ux=ux,uy=uy,e=e))

for v,(m,ux,uy,nx,ny,e) in enumerate([(R(1),R(-5),R(-5),R(3,5),R(4,5),R(3,7)),(R(5),R(-7),R(-1),R(4,5),R(3,5),R(9,31))],1):
    un=ux*nx+uy*ny;vx=ux-(1+e)*un*nx;vy=uy-(1+e)*un*ny
    Q('surfaces','F',2,v,'An inclined smooth surface',
      rf'<p>A smooth fixed line has inward unit normal \(({T(nx)},{T(ny)})\). A \({T(m)}\) kg particle approaches with velocity \(({T(ux)},{T(uy)})\) m s⁻¹ and \(e={T(e)}\). Give its complete outgoing velocity, both impulse components and the energy loss.</p>',
      [field('vx','Outgoing horizontal velocity',vx),field('vy','Outgoing vertical velocity',vy),field('Jx','Horizontal impulse',m*(vx-ux)),field('Jy','Vertical impulse',m*(vy-uy)),field('lost','Energy lost',m*(1-e**2)*un**2/2)],
      '<p>Compute u·n, then v=u−(1+e)(u·n)n. Check that the impulse is parallel to n and the tangential velocity is unchanged.</p>',
      'wall_tilt',dict(m=m,ux=ux,uy=uy,nx=nx,ny=ny,e=e))

for v,(ux,down,e) in enumerate([(R(3),R(8),R(1,2)),(R(5),R(9),R(2,3))],1):
    g=R(10);up=e*down;time=2*up/g
    Q('surfaces','F',3,v,'Rebound followed by the next complete flight',
      rf'<p>A particle hits smooth horizontal ground with velocity \(({T(ux)},-{T(down)})\) m s⁻¹. Let \(e={T(e)}\) and \(g=10\) m s⁻², upward positive. Give its full rebound velocity, time to the next ground contact, maximum height and horizontal range during that flight.</p>',
      [field('vx','Rebound horizontal velocity',ux),field('vy','Rebound upward velocity',up),field('time','Next flight time',time),field('height','Maximum height',up**2/(2*g)),field('range','Horizontal range',ux*time)],
      '<p>After impact the vertical launch speed is e times the incoming downward speed. Solve y=wt−gt²/2 for its positive zero, use H=w²/(2g), and multiply the flight time by the unchanged horizontal velocity.</p>',
      'ground_flight',dict(m=1,ux=ux,down=down,e=e,g=g))

for v,(a,b,ux,uy,wx,wy,e) in enumerate([(R(3),R(1),R(5),R(2),R(-1),R(4),R(1,3)),(R(2),R(3),R(7),R(-1),R(2),R(3),R(3,5))],1):
    va,vb=impact(a,b,ux,wx,e)
    Q('spheres','B',1,v,'All four velocity components after oblique contact',
      rf'<p>At contact A is to the left of B on a horizontal line of centres. Let their masses be \({T(a)}\) and \({T(b)}\) kg, initial velocities \(({T(ux)},{T(uy)})\) and \(({T(wx)},{T(wy)})\) m s⁻¹, and \(e={T(e)}\). Give both complete outgoing velocities and the total energy loss.</p>',
      [field('vax','A horizontal velocity',va),field('vay','A vertical velocity',uy),field('vbx','B horizontal velocity',vb),field('vby','B vertical velocity',wy),field('lost','Total energy lost',loss(a,b,ux,wx,e))],
      '<p>Use momentum and restitution only for the horizontal normal components. Keep each sphere’s own vertical component; energy is lost only from the relative normal motion.</p>',
      'sphere_axis',dict(a=a,b=b,ux=ux,uy=uy,wx=wx,wy=wy,e=e))

for v,(a,b,nx,ny,un,ut,wn,wt,e) in enumerate([(R(1),R(1),R(3,5),R(4,5),R(4),R(1),R(-2),R(3),R(1,2)),(R(2),R(1),R(4,5),R(3,5),R(5),R(2),R(-1),R(-1),R(1,2))],1):
    va,vb=impact(a,b,un,wn,e);tx=-ny;ty=nx
    Q('spheres','B',2,v,'Reconstruct velocities in a tilted contact basis',
      rf'<p>At an approaching smooth-sphere contact use \(\mathbf n=({T(nx)},{T(ny)})\) from A to B and \(\mathbf t=(-{T(ny)},{T(nx)})\). The masses are \({T(a)}\), \({T(b)}\) kg; incoming (normal,tangential) components are \(({T(un)},{T(ut)})\), \(({T(wn)},{T(wt)})\) m s⁻¹, and \(e={T(e)}\). Give all outgoing Cartesian components and the magnitude of A’s impulse.</p>',
      [field('vax','A Cartesian horizontal velocity',va*nx+ut*tx),field('vay','A Cartesian vertical velocity',va*ny+ut*ty),field('vbx','B Cartesian horizontal velocity',vb*nx+wt*tx),field('vby','B Cartesian vertical velocity',vb*ny+wt*ty),field('J','Magnitude of A impulse',abs(a*(va-un)))],
      '<p>Solve the two normal equations. The tangential components stay ut and wt. Reconstruct each vector using the stated common unit basis; impulse has no tangential component.</p>',
      'sphere_tilt',dict(a=a,b=b,nx=nx,ny=ny,un=un,ut=ut,wn=wn,wt=wt,e=e))

for v,(U,h) in enumerate([(R(10),R(4)),(R(13),R(6))],1):
    e=s.sqrt(1-4*h*h/U**2);va=U*(1-e)/2;vb=U*(1+e)/2
    Q('spheres','B',3,v,'A physical restitution value from perpendicular paths',
      rf'<p>Two equal smooth spheres meet with a horizontal line of centres, A to the left. Their incoming velocities are \(({T(U)},{T(h)})\) and \((0,-{T(h)})\) m s⁻¹. Their outgoing paths are perpendicular. Give the physical value of e and both complete outgoing velocities.</p>',
      [field('e','Physical coefficient of restitution',e),field('vax','A horizontal velocity',va),field('vay','A vertical velocity',h),field('vbx','B horizontal velocity',vb),field('vby','B vertical velocity',-h)],
      '<p>Use v_An=U(1−e)/2 and v_Bn=U(1+e)/2. The full dot product is U²(1−e²)/4−h². Set it to zero and retain only e in [0,1]; then reconstruct the two vectors.</p>',
      'sphere_perpendicular',dict(U=U,h=h))

for v,(U,d,e1,e2) in enumerate([(R(6),R(4),R(1,3),R(0)),(R(12),R(6),R(1,2),R(1,3))],1):
    va,vb=impact(R(1),R(1),U,R(0),e1);time=d/vb;vbb,vc=impact(R(1),R(1),vb,R(0),e2);gap=d-va*time
    Q('successive','C',1,v,'The complete state after two successive pair impacts',
      rf'<p>Three equal particles A, B and C move on a smooth line. At t=0, A strikes stationary B at x=0 with velocity +\({T(U)}\) m s⁻¹. C is at rest at x=\({T(d)}\) m. Let \(e_{{AB}}={T(e1)}\), \(e_{{BC}}={T(e2)}\). Give the time and position of the B–C contact, all three velocities just after it, and the A–B gap then.</p>',
      [field('time','B-C contact time',time),field('position','B-C contact position',d),field('va','A velocity after B-C contact',va),field('vb','B velocity after B-C contact',vbb),field('vc','C velocity after B-C contact',vc),field('gap','A-B gap after B-C contact',gap)],
      '<p>After the first equal-mass impact find A and B’s velocities. B travels to C while A continues moving. Apply a new impact to B and C only. Here A and B finish with equal velocities and a positive gap, so A cannot catch B later.</p>',
      'three_chain',dict(U=U,d=d,e1=e1,e2=e2))

for v,(a,b,L,ew,ep) in enumerate([(R(1),R(5),R(10),R(1,5),R(1,2)),(R(2),R(6),R(12),R(1,2),R(3,5))],1):
    twall=L/b;gap=L-a*twall;dt=gap/(a+ew*b);time=twall+dt;x=a*time;va,vb=impact(R(1),R(1),a,-ew*b,ep)
    Q('successive','C',2,v,'A rebound and the next mutual contact',
      rf'<p>Immediately after separating at x=0, equal particles A and B have velocities +\({T(a)}\), +\({T(b)}\) m s⁻¹. A wall is at x=\({T(L)}\) m; its coefficient with B is \({T(ew)}\). Their mutual coefficient is \({T(ep)}\). Give B’s first wall-contact time, the absolute time and position of the next A–B impact, and both velocities immediately after it.</p>',
      [field('twall','B wall-contact time',twall),field('time','Absolute A-B recontact time',time),field('position','A-B recontact position',x),field('va','A velocity just after recontact',va),field('vb','B velocity just after recontact',vb)],
      '<p>Propagate A while B reaches the wall. B then has signed velocity −e_wall b. Use the new positive closing speed a+e_wall b for the intervening gap, add the elapsed time, and solve the final equal-mass impact.</p>',
      'wall_recollision',dict(a=a,b=b,L=L,ew=ew,ep=ep))

for v,(w,e) in enumerate([(R(6),R(1,2)),(R(8),R(3,4))],1):
    g=R(10);after=w*e**2
    Q('successive','C',3,v,'Times, distances and a numbered rebound',
      rf'<p>Immediately after a ground impact a ball has upward speed \({T(w)}\) m s⁻¹. Every later impact with smooth fixed horizontal ground has \(e={T(e)}\), and g=10 m s⁻². Give the limiting total time and total vertical distance from now, the upward speed after two further impacts, and the maximum height of that ensuing flight.</p>',
      [field('time','Limiting total time',2*w/(g*(1-e))),field('distance','Limiting total vertical distance',w*w/(g*(1-e*e))),field('after','Upward speed after two further impacts',after),field('height','Maximum height after those two impacts',after**2/(2*g))],
      '<p>Successive launch speeds have ratio e and heights have ratio e². Sum 2w/g for each full flight time and w²/g for each full up-and-down distance. The speed after exactly two further contacts is we²; use its square to find the next apex height.</p>',
      'ground_bounces',dict(w=w,e=e,g=g,n=2))

choices = {
 'direct':[
   ('When may pair momentum be conserved?', 'Which condition justifies conserving a pair’s momentum in a chosen direction during impact?',{'A':'Both masses are equal','B':'The external impulse on the pair in that direction is negligible','C':'The collision loses no energy','D':'Both incoming speeds are positive'},'B','Internal contact impulses cancel when the pair is treated as a system; a non-negligible external impulse would change its total momentum.'),
   ('What changes the system momentum?', 'A pair experiences a nonzero external impulse during an impact. What equals its change in total momentum?',{'A':'The impulse on either one particle','B':'The energy lost divided by time','C':'The external impulse on the whole pair','D':'Zero because all collisions conserve momentum'},'C','The pair’s internal impulses cancel; its external impulse equals the change in its total momentum.')],
 'surfaces':[
   ('What does smooth contact preserve?', 'A particle hits a smooth fixed line obliquely. Which component of its velocity remains unchanged during the impact?',{'A':'Its normal component','B':'Its speed','C':'Its component along the incoming path','D':'Its component tangential to the line'},'D','A smooth line supplies a normal impulse only, so the tangential velocity is unchanged.'),
   ('Does zero restitution stop the particle?', 'At a smooth fixed line, e=0 and the incoming tangential velocity is nonzero. What follows immediately after impact?',{'A':'Normal velocity is zero, but tangential motion remains','B':'The whole velocity must be zero','C':'The tangential velocity reverses','D':'The particle gains normal kinetic energy'},'A','Zero restitution removes the outgoing normal component; the unaffected tangential component can still be nonzero.')],
 'spheres':[
   ('Does e=0 make the spheres one body?', 'Two smooth spheres have e=0, but their tangential velocities differ at contact. Which conclusion is valid?',{'A':'They must remain permanently joined','B':'Their normal velocities agree, but their complete velocities need not','C':'Both complete velocities are zero','D':'Their tangential velocities become their average'},'B','Restitution controls only relative normal velocity. Smooth contact leaves each tangential component unchanged.'),
   ('When can full velocities agree?', 'At an oblique smooth-sphere contact with e=0, what extra condition is needed for the two complete velocities to agree immediately afterwards?',{'A':'The masses must be equal','B':'One incoming speed must be zero','C':'The two incoming tangential velocity components must agree','D':'The initial kinetic energies must be equal'},'C','At e=0 the outgoing normal components already agree; equality of the full vectors additionally requires equality of their unchanged tangential components.')],
 'successive':[
   ('Which contact happens next?', 'Several contacts are algebraically possible from the present state. How is the next event chosen?',{'A':'Use the earliest positive physically reachable contact time','B':'Use the smallest gap without considering velocity','C':'Use the largest coefficient of restitution','D':'Choose any pair, because collision order never matters'},'A','Both geometry and signed relative velocities determine reachable event times; select the earliest positive valid event.'),
   ('Can separated equal-velocity particles meet?', 'After an impact, A is behind B with a positive gap and both have the same constant signed velocity. There are no other forces or contacts. What happens?',{'A':'A catches B because it is behind','B':'The gap shrinks at twice their speed','C':'They collide again at zero elapsed time','D':'The positive gap remains constant, so there is no further mutual contact'},'D','The relative velocity is zero, so the existing positive separation stays unchanged.')]
}
for lesson,code in [('direct','D'),('surfaces','F'),('spheres','B'),('successive','C')]:
    for variant,(title,prompt,options,answer,why) in enumerate(choices[lesson],1):
        Q(lesson,code,4,variant,title,'<p>'+prompt+'</p>',[field('reason','Choose one answer',answer,'choice',options)],'<p>'+why+'</p>','logic',dict(answer=answer))

# Authoring-time typography for mathematical prose; existing TeX and HTML
# attributes are protected. This never changes the answer fields or inputs.
def prose_math(value):
    import re
    expressions = {
        'u_A−u_B&gt;0': r'u_A-u_B>0',
        'u_An−u_Bn&gt;0': r'u_{An}-u_{Bn}>0',
        'v_B−v_A=e(u_A−u_B)': r'v_B-v_A=e(u_A-u_B)',
        'v_An=U(1−e)/2': r'v_{An}=\frac{U(1-e)}2',
        'v_Bn=U(1+e)/2': r'v_{Bn}=\frac{U(1+e)}2',
        'U²(1−e²)/4−h²': r'\frac{U^2(1-e^2)}4-h^2',
        'm_A(v_A−u_A)': r'm_A(v_A-u_A)',
        'm(v−u)=J': r'\mathbf J=m(\mathbf v-\mathbf u)',
        'm(v−u)': r'm(v-u)',
        'a+e_wall b': r'a+e_{\rm wall}b',
        '−e_wall b': r'-e_{\rm wall}b',
        'e_AB=1/2': r'e_{AB}=\frac12',
        'e_BC=1/3': r'e_{BC}=\frac13',
        'v=u−(1+e)(u·n)n': r'\mathbf v=\mathbf u-(1+e)(\mathbf u\cdot\mathbf n)\mathbf n',
        'v_x=−eu_x': r'v_x=-eu_x',
        'v_y=u_y': r'v_y=u_y',
        'J=m(v−u)': r'\mathbf J=m(\mathbf v-\mathbf u)',
        'u·n&lt;0': r'\mathbf u\cdot\mathbf n<0',
        'u·n': r'\mathbf u\cdot\mathbf n',
        'v_A·v_B=0': r'\mathbf v_A\cdot\mathbf v_B=0',
        'x_i=x_i0+v_i t': r'x_i=x_{i0}+v_i t',
        'x_A=x_B': r'x_A=x_B',
        'v_A&gt;v_B': r'v_A>v_B',
        'y=wt−gt²/2': r'y=wt-\frac12gt^2',
        'H=w²/(2g)': r'H=\frac{w^2}{2g}',
        'w²/(2g)': r'\frac{w^2}{2g}',
        'w, ew, e²w,…': r'w,ew,e^2w,\ldots',
        '2w/g': r'\frac{2w}{g}',
        'w²/g': r'\frac{w^2}{g}',
        'we²': r'we^2',
        '0≤e≤1': r'0\le e\le1',
        'v_A&lt;0': r'v_A<0',
        '18−1/2=35/2': r'18-\frac12=\frac{35}2',
        '25/4−1=21/4': r'\frac{25}4-1=\frac{21}4',
        '1×4+2×(−2)=0': r'1\times4+2\times(-2)=0',
    }
    parts=re.split(r'(\\\(.*?\\\)|\\\[.*?\\\]|<!--.*?-->|<[^>]*>)',value,flags=re.S)
    for i,part in enumerate(parts):
        if part.startswith((r'\(',r'\[','<')):continue
        # Protect newly inserted formula spans from subsequent replacements too.
        for expression,tex in expressions.items():
            segments=re.split(r'(\\\(.*?\\\))',part,flags=re.S)
            part=''.join(segment if segment.startswith(r'\(') else segment.replace(expression,r'\('+tex+r'\)') for segment in segments)
        segments=re.split(r'(\\\(.*?\\\))',part,flags=re.S)
        def remaining(text):
            text=re.sub(r'\b([uvmxe])_([A-Za-z0-9]+)\b',lambda m:r'\('+m[1]+'_{'+m[2]+r'}\)',text)
            text=re.sub(r'(?<![\w])e=(\d+(?:/\d+)?)(?![\w/])',lambda m:r'\(e='+T(m[1])+r'\)',text)
            for plain,tex in [('α',r'\alpha'),('β',r'\beta'),('e²',r'e^2')]:text=text.replace(plain,r'\('+tex+r'\)')
            return text
        parts[i]=''.join(segment if segment.startswith(r'\(') else remaining(segment) for segment in segments)
    return ''.join(parts)

for lesson in lessons:
    for key in ['before','ideas','method']:lesson[key]=prose_math(lesson[key])
    lesson['mistakes']=[prose_math(m) for m in lesson['mistakes']]
    for example in lesson['examples']:
        for key in ['question','solution']:example[key]=prose_math(example[key])
for question in questions:
    for key in ['prompt_html','answer_html','solution_html','hint_html']:question[key]=prose_math(question[key])

assert len(lessons)==4 and len(models)==16 and len(questions)==32 and len(quick_models)==32
