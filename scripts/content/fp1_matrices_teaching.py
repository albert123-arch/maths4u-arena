"""Independent explanations, in the mathematical order of coursebook 4.1–4.4."""
import sympy as s
def mat(rows):return s.Matrix(rows)
def tex(value):return s.latex(value,mat_str='pmatrix',mat_delim=None)
def mx(rows):return tex(mat(rows))
def ex(code,title,question,solution):return dict(title=title,question=question,solution=solution,verification=code)
def lesson(key,title,summary,objective,before,ideas,method,mistakes,examples):
    return dict(key=key,id='fp1_matrices_'+key.replace('-','_'),title=title,summary=summary,objective=objective,before=before,ideas=ideas,method=method,mistakes=mistakes,examples=examples)

A=mat([[3,-2],[1,4]]);B=mat([[0,5],[-1,2]])
U=mat([[1,2],[0,1]]);V=mat([[2,0],[1,1]])
P=mat([[1,0,2],[0,1,-1]]);Q=mat([[1,0],[0,1],[0,0]])
C=mat([[2,1],[3,2]]);G=mat([[1,1,0],[0,1,1],[0,0,1]])
H=mat([[3,1],[2,1]]);J=mat([[7,-2],[5,1]])
L=mat([[1,3],[0,1]]);K=mat([[1,0],[2,1]]);D=mat([[4,1],[2,3]])
E=mat([[2,0,1],[1,3,2],[0,1,1]])
R=mat([[0,-1],[1,0]]);S=mat([[3,0],[0,1]])
N=mat([[2,1],[-1,1]]);inputs=mat([[1,2],[1,-1]]);outputs=N*inputs
space=mat([[0,-1,0],[1,0,0],[0,0,-1]])

lessons=[
lesson('operations','Working with matrix products',
 'Use dimensions, row-by-column multiplication and the order of factors.',
 'Calculate complete matrix expressions and explain when a product or cancellation is valid.',
 r'<p>You need scalar products, simultaneous linear equations and algebraic expansion. A matrix entry is identified by its row first and its column second.</p>',
 r'''<h3>Dimensions determine the permitted calculation</h3><p>An \(m\times n\) matrix has \(m\) rows and \(n\) columns. Add or subtract matrices only when their dimensions agree. A scalar multiplies every entry.</p>
 <p>If \(A\) is \(m\times n\) and \(B\) is \(n\times p\), their product has dimensions \(m\times p\). Its entry in row \(i\), column \(j\) is</p>\[(AB)_{ij}=\sum_{k=1}^{n}a_{ik}b_{kj}.\]
 <h3>Order and grouping are different questions</h3><p>The factors in \((AB)C=A(BC)\) keep the same order. Associativity lets you choose a convenient grouping; it does not allow \(ABC\) to become \(ACB\). Distributivity also preserves order: \(A(B+C)=AB+AC\).</p>
 <p>Generally \(AB\ne BA\), even when both products exist. Rectangular factors can produce different-sized products. For a square matrix, \(A^2=AA\), not the square of each entry.</p>
 <h3>Zero and identity matrices</h3><p>The zero matrix contains only zeros; \(I_n\) has ones on its main diagonal and zeros elsewhere. For an \(m\times n\) matrix, \(I_mA=A=AI_n\). The identities on the two sides need not have the same size.</p>
 <h3>A zero product does not justify cancellation</h3><p>Non-zero matrices can multiply to zero. From \(AX=AY\), conclude \(X=Y\) only when a suitable inverse of \(A\) is known to exist. Matrix powers with the same square base obey \(A^pA^q=A^{p+q}\) for non-negative integer powers; negative powers require invertibility.</p>''',
 r'<ol><li>Write the dimensions and check every indicated product.</li><li>Choose a grouping without changing factor order.</li><li>Calculate each entry as a row–column scalar product.</li><li>Check every entry, including zeros, and justify any cancellation.</li></ol>',
 ['Rows are read before columns when naming an entry.','Multiplying corresponding entries is not matrix multiplication.','Associativity never permits swapping factors.','A non-zero factor need not be cancellable.'],
 [
 ex('E-O1','1 · Combine every corresponding entry',rf'<p>Find \(2A-B\), where \(A={tex(A)}\) and \(B={tex(B)}\).</p>',
 rf'<p>Double every entry of \(A\), then subtract the entry in the same position of \(B\).</p>\[2A-B={tex(2*A-B)}.\]<p>For example, the upper-right entry is \(2(-2)-5=-9\).</p>'),
 ex('E-O2','2 · Check both orders',rf'<p>For \(U={tex(U)}\), \(V={tex(V)}\), find \(UV\) and \(VU\).</p>',
 rf'\[UV={tex(U*V)}.\]\[VU={tex(V*U)}.\]<p>The upper-left entries already distinguish the products. The inner dimensions agree in both cases, but compatibility does not make the factors commute.</p>'),
 ex('E-O3','3 · A one-sided rectangular identity',rf'<p>Let \(P={tex(P)}\), \(Q={tex(Q)}\). Calculate both products and explain \((QP)^2\).</p>',
 rf'\[PQ={tex(P*Q)}.\]\[QP={tex(Q*P)}.\]<p>The first product is \(I_2\); the second is not \(I_3\). Keeping the order, \((QP)^2=Q(PQ)P=QI_2P=QP\). No inverse of a rectangular matrix was used.</p>'),
 ex('E-O4','4 · Powers from a vanishing product',r'<p>For \(A=\begin{pmatrix}1&4\\0&1\end{pmatrix}\), obtain a formula for \(A^n\), \(n\ge0\).</p>',
 r'<p>Write \(A=I+N\), where \(N=\begin{pmatrix}0&4\\0&0\end{pmatrix}\). Direct multiplication gives \(N^2=0\), so all higher terms in the binomial expansion vanish:</p>\[A^n=I+nN=\begin{pmatrix}1&4n\\0&1\end{pmatrix}.\]<p>Alternatively, check \(n=0\), then multiply the proposed formula on the right by \(A\); the upper-right entry becomes \(4(n+1)\).</p>')
 ]),
lesson('inverses','Undoing matrix equations',
 'Find inverses and reverse composite products without losing the order.',
 'Find and verify two-by-two and three-by-three inverses, then use them to solve matrix equations.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_matrices_operations">matrix products</a>. You need elimination in simultaneous equations and exact fractions.</p>',
 r'''<h3>An inverse undoes a square matrix on both sides</h3><p>For a square matrix \(A\), its inverse satisfies \(AA^{-1}=A^{-1}A=I\). A matrix with an inverse is non-singular; one without an inverse is singular.</p>
 <p>For a two-by-two matrix, direct multiplication verifies</p>
 \[A=\begin{pmatrix}a&b\\c&d\end{pmatrix},\]
 \[A^{-1}=\frac1{ad-bc}\begin{pmatrix}d&-b\\-c&a\end{pmatrix},\]
 <p>provided \(ad-bc\ne0\). This denominator is the determinant; the next lesson develops it for larger matrices. Test any parameter restrictions before using the inverse.</p>
 <h3>Row reduction works in larger dimensions</h3><p>Start with the augmented array \([A\mid I]\). Apply each reversible row operation to the whole row: swap rows, add a multiple of another row, or multiply by a non-zero scalar. If the left block becomes \(I\), the right block is \(A^{-1}\). A column operation is not the same process. A zero pivot may require a row swap; it does not by itself prove singularity.</p>
 <h3>Undo the last factor first</h3>\[(AB)^{-1}=B^{-1}A^{-1}.\]
 <p>Indeed \(AB(B^{-1}A^{-1})=I\), and the reverse-side product also gives \(I\). For \(AX=C\), multiply on the left by \(A^{-1}\). For \(XB=C\), multiply on the right by \(B^{-1}\). Therefore \(AXB=C\) gives \(X=A^{-1}CB^{-1}\), when both inverses exist.</p>
 <p>An invertible coefficient matrix gives one solution for each right-hand column. A singular one can give none or many; it is not enough to say “the equation has no solution” merely because the inverse fails.</p>''',
 r'<ol><li>Check dimensions and invertibility, retaining parameter exclusions.</li><li>Use the two-by-two formula or reduce the full augmented array.</li><li>Multiply by inverses on their required sides.</li><li>Verify the complete result by multiplication in the original equation.</li></ol>',
 ['Reverse the order when inverting a product.','Apply row operations to both blocks of an augmented array.','Check a candidate inverse by a product, not its appearance.','A singular matrix does not automatically make every associated equation inconsistent.'],
 [
 ex('E-I1','1 · An exact two-by-two inverse',rf'<p>Find and verify the inverse of \(C={tex(C)}\).</p>',
 rf'<p>The determinant is \(4-3=1\). Swap the diagonal entries and negate the others:</p>\[C^{{-1}}={tex(C.inv())}.\]<p>Multiplication in either order gives \(I_2\), confirming every entry.</p>'),
 ex('E-I2','2 · Reduce a three-by-three augmented array',rf'<p>Find \(G^{{-1}}\), where \(G={tex(G)}\), by row operations.</p>',
 rf'<p>Begin with \([G\mid I_3]\). Apply \(R_2\leftarrow R_2-R_3\), then \(R_1\leftarrow R_1-R_2\), using the updated second row. The left block is now \(I_3\); the right block is</p>\[G^{{-1}}={tex(G.inv())}.\]<p>The original matrix times this answer gives \(I_3\). Updating the left block alone would lose the inverse.</p>'),
 ex('E-I3','3 · Solve two right-hand columns together',rf'<p>Find \(X\) from \(HX=J\), where \(H={tex(H)}\), \(J={tex(J)}\).</p>',
 rf'<p>The determinant of \(H\) is \(1\), so left multiplication is allowed.</p>\[H^{{-1}}={tex(H.inv())}.\]\[X=H^{{-1}}J={tex(H.inv()*J)}.\]<p>Substitute this entire matrix back into \(HX\), checking both columns.</p>'),
 ex('E-I4','4 · Undo factors on opposite sides',rf'<p>Solve \(LXK=D\), with \(L={tex(L)}\), \(K={tex(K)}\), \(D={tex(D)}\).</p>',
 rf'<p>Remove \(L\) on the left and \(K\) on the right:</p>\[X=L^{{-1}}DK^{{-1}}={tex(L.inv()*D*K.inv())}.\]<p>The cancellation is \(L(L^{{-1}}DK^{{-1}})K=D\). Reversing both inverses around \(D\) would solve a different equation.</p>')
 ]),
lesson('determinants','Determinants, restrictions and scale',
 'Connect cofactor expansion and row operations to invertibility, area and volume.',
 'Evaluate determinants and use their signs and zeros correctly in algebraic and geometrical problems.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_matrices_inverses">inverses</a> and quadratic equations. Keep exact radicals when finding parameter values.</p>',
 r'''<h3>A scalar attached to a square matrix</h3><p>The determinant is a number, not another matrix. For a two-by-two matrix it is \(ad-bc\). For</p>
 \[A=\begin{pmatrix}a&b&c\\d&e&f\\g&h&i\end{pmatrix},\]
 \[\det A=a(ei-fh)-b(di-fg)+c(dh-eg).\]
 <p>Each minor removes one row and one column. Its cofactor also has the alternating sign \((-1)^{i+j}\). Expand along a row or column containing zeros when convenient. The transpose of the cofactor matrix is the adjugate; \(A^{-1}=\operatorname{adj}(A)/\det A\) when \(\det A\ne0\).</p>
 <h3>Track row operations</h3><ul><li>Adding a multiple of one row to another leaves the determinant unchanged.</li><li>Swapping two rows changes its sign.</li><li>Scaling one row by \(k\) scales it by \(k\).</li></ul><p>For a triangular matrix, multiply the diagonal entries. If elimination has scaled or swapped rows, undo those changes when recovering the original determinant.</p>
 <h3>Products, scalar factors and singularity</h3>
 \[\det(AB)=\det A\det B,\qquad \det(A^{-1})=\frac1{\det A}.\]
 <p>The product rule here requires square factors of the same size. For an \(n\times n\) matrix, \(\det(kA)=k^n\det A\), because all \(n\) rows are scaled. A square matrix is singular precisely when its determinant is zero. Solve every parameter root, including repeated roots, before using an inverse.</p>
 <h3>Geometry uses the absolute value</h3><p>A plane region has area multiplier \(|\det M|\). In three dimensions a solid has volume multiplier \(|\det M|\). A negative determinant records reversed orientation, not a negative area or volume. A singular transformation collapses dimension, giving zero area or volume in the ambient space.</p>''',
 r'<ol><li>Choose cofactor expansion or controlled row reduction.</li><li>Retain every cofactor sign and row scaling factor.</li><li>Solve determinant conditions before applying inverse rules.</li><li>Use an absolute value for a geometric scale factor.</li></ol>',
 ['A cofactor is a signed minor.','Scaling a whole three-by-three matrix multiplies its determinant by the cube.','Keep both signs when an area condition gives an absolute value.','Determinants of rectangular factors are not defined.'],
 [
 ex('E-D1','1 · Expand along a useful row',rf'<p>Find \(\det E\), where \(E={tex(E)}\).</p>',
 rf'<p>Expand along the first row:</p>\[\det E=2(3-2)+1(1-0)=3.\]<p>The middle term vanishes. As a check, cofactor calculation gives</p>\[\operatorname{{adj}}(E)={tex(E.adjugate())},\]<p>and \(E\operatorname{{adj}}(E)=3I_3\).</p>'),
 ex('E-D2','2 · Keep every exceptional parameter',r'<p>For \(A=\begin{pmatrix}t&1&0\\1&t&0\\0&0&t-3\end{pmatrix}\), find every value of \(t\) for which no inverse exists.</p>',
 r'<p>Expanding by the last row gives</p>\[\det A=(t-3)(t^2-1)=(t-3)(t-1)(t+1).\]<p>All excluded values are \(-1,1,3\). At every other real value the determinant is non-zero and the inverse exists.</p>'),
 ex('E-D3','3 · Recover a determinant after row changes',r'<p>Starting from a three-by-three matrix \(A\), interchange rows 1 and 2, then multiply row 3 by 4, and finally add twice row 3 to row 1. The resulting triangular matrix has diagonal \(2,-3,5\). Find \(\det A\).</p>',
 r'<p>The final determinant is \(2(-3)5=-30\). The swap and row scaling give a total factor of \(-4\); the last row addition changes nothing. Thus \(-4\det A=-30\), so</p>\[\det A=\frac{15}{2}.\]'),
 ex('E-D4','4 · Separate orientation from size',r'<p>A plane map has matrix \(M=\begin{pmatrix}k&2\\1&k\end{pmatrix}\). A region of area 6 has image area 12. Find all \(k\) and the inverse area multiplier.</p>',
 r'<p>The condition is \(|k^2-2|=2\). The equations \(k^2-2=2\) and \(k^2-2=-2\) give</p>\[k\in\{-2,0,2\}.\]<p>Each allowed matrix has determinant \(2\) or \(-2\), so it is invertible. Its inverse has area multiplier \(1/2\), regardless of orientation.</p>')
 ]),
lesson('plane-maps','Building plane transformations',
 'Use coordinate columns to compose maps, recover a matrix and transform a line.',
 'Construct and apply matrices for plane transformations with the correct order, centre and scale.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_matrices_determinants">determinants and area</a>, exact trigonometric values, and Cartesian equations of lines.</p>',
 r'''<h3>Columns are images of basis directions</h3><p>For a linear map fixing the origin, the columns of \(M\) are the images of \((1,0)\) and \((0,1)\). An arbitrary image is \(M(x,y)^T\). More generally, if two independent input columns form \(P\) and their images form \(Q\), then \(MP=Q\), hence \(M=QP^{-1}\).</p>
 <h3>Standard maps and their descriptions</h3>
 \[\text{x-stretch: }\begin{pmatrix}k&0\\0&1\end{pmatrix},\]
 \[\text{y-stretch: }\begin{pmatrix}1&0\\0&k\end{pmatrix}.\]
 <p>The factors describe distances parallel to the named axis, not a translation. An enlargement about the origin has matrix \(kI\). Reflection in the x-axis changes only the y-coordinate; reflection in the y-axis changes only x.</p>
 <p>An anticlockwise rotation about the origin is</p>
 \[R(\theta)=\begin{pmatrix}\cos\theta&-\sin\theta\\\sin\theta&\cos\theta\end{pmatrix}.\]
 <p>The matrix \(\begin{pmatrix}1&h\\0&1\end{pmatrix}\) is a shear fixing the x-axis and sending \((0,1)\) to \((h,1)\). The matrix \(\begin{pmatrix}1&0\\h&1\end{pmatrix}\) fixes the y-axis and sends \((1,0)\) to \((1,h)\). Give the fixed axis and an image to make the description unambiguous.</p>
 <h3>Apply the rightmost matrix first</h3><p>If \(S\) acts first and \(R\) second, then the combined matrix is \(RS\). Undo it in the reverse temporal order, using \(S^{-1}R^{-1}\).</p>
 <h3>Images and preimages of lines</h3><p>Write \(X=ax+by,\ Y=cx+dy\). For an image line, substitute the inverse coordinate equations into the original line, or transform a parametrisation. For a preimage, substitute the forward equations into the desired image line. A singular map needs special care: a line can collapse to a point.</p>''',
 r'<ol><li>State how each map acts on column coordinates.</li><li>Multiply factors in reverse temporal order.</li><li>Check a simple point or both basis columns.</li><li>Transform the whole line equation and interpret area using the absolute determinant.</li></ol>',
 ['A shear description needs its fixed axis and direction.','A two-by-two matrix acts linearly and fixes the origin.','The first transformation is the rightmost factor.','Forward substitution finds a preimage; an inverse substitution finds an image.'],
 [
 ex('E-P1','1 · Recover a rotation from the basis',r'<p>Find the matrix of an anticlockwise rotation through \(\pi/6\) about the origin, then find the image of \((2,0)\).</p>',
 r'<p>The basis columns go to \((\frac{\sqrt3}{2},\frac12)\) and \((-\frac12,\frac{\sqrt3}{2})\).</p>\[R=\begin{pmatrix}\frac{\sqrt3}{2}&-\frac12\\\frac12&\frac{\sqrt3}{2}\end{pmatrix}.\]<p>The image of \((2,0)\) is \((\sqrt3,1)\). The length remains \(2\), and the positive y-coordinate confirms the direction.</p>'),
 ex('E-P2','2 · A stretch followed by a quarter-turn',rf'<p>Apply an x-stretch of factor 3, followed by an anticlockwise quarter-turn. Find the composite matrix and the image of \((1,-2)\).</p>',
 rf'<p>The stretch acts first, so</p>\[M=RS={tex(R*S)}.\]<p>The image is \((2,3)\). Applying the maps separately gives \((1,-2)\mapsto(3,-2)\mapsto(2,3)\). The area multiplier is \(3\).</p>'),
 ex('E-P3','3 · Reconstruct a map from independent inputs',rf'<p>The input columns of \(P={tex(inputs)}\) have corresponding images in \(Q={tex(outputs)}\). Find \(M\).</p>',
 rf'<p>Since \(\det P=-3\ne0\), these two input columns determine the whole linear map.</p>\[MP=Q,\qquad M=QP^{{-1}}={tex(N)}.\]<p>Multiplying this answer by each original input recovers both supplied images. A dependent pair of input columns would not justify this inverse.</p>'),
 ex('E-P4','4 · Transform the complete line',rf'<p>For \(M={tex(N)}\), find the image of \(y=2x-1\).</p>',
 r'<p>Write the original points as \((t,2t-1)\). Their images satisfy</p>\[X=4t-1,\qquad Y=t-1.\]<p>Eliminate \(t\), giving</p>\[X-4Y=3.\]<p>Conversely, each point on this image line comes from \(t=Y+1\), so the equation describes the whole image.</p>')
 ]),
lesson('invariants','Invariant sets and maps in space',
 'Distinguish fixed points from invariant lines, include vertical directions and extend to three coordinates.',
 'Find complete fixed sets and invariant lines, and apply standard three-dimensional matrix transformations.',
 r'<p>Review <a href="/courses/maths4u-9231-fp1/topics/fp1_matrices_plane_maps">plane transformations</a>, quadratic discriminants and scalar products. Use three-entry columns for spatial coordinates.</p>',
 r'''<h3>Fixed point and invariant line mean different things</h3><p>A point is fixed when \(Mv=v\); solve \((M-I)v=0\). An invariant line maps onto itself as a set, although its individual points may move. For a non-singular plane map, a direction column \(v\ne0\) defines an invariant line through the origin when \(Mv=\lambda v\), with non-zero \(\lambda\). Only \(\lambda=1\) fixes every point on it.</p>
 <p>For \(M=\begin{pmatrix}a&b\\c&d\end{pmatrix}\), put \(v=(1,m)^T\). Collinearity gives</p>\[bm^2+(a-d)m-c=0.\]
 <p>Check the vertical direction \((0,1)^T\) separately. Do not divide by a possibly zero coordinate. Repeated roots need the original equations: a scalar matrix can make every direction invariant, rather than just one.</p>
 <h3>Invariant lines need not pass through the origin</h3><p>Substitute an affine parametrisation of \(y=mx+c\), or use inverse coordinates to transform its equation. Check the intercept as well as the direction. A family of parallel lines may each be invariant. For singular maps, distinguish a line mapped onto itself from one collapsed into a point.</p>
 <h3>Three coordinates use the same product rule</h3><p>Columns are now \((x,y,z)^T\). A diagonal matrix scales the three coordinate directions. Reflection in the xy-plane has diagonal \(1,1,-1\); the fixed plane is \(z=0\). An enlargement about the origin is \(kI_3\), with volume multiplier \(|k|^3\).</p>
 <p>Put \(c=\cos\theta,\ s=\sin\theta\). Positive rotations use the right-hand convention: view from the positive named axis towards the origin. The matrices are</p>
 \[R_x=\begin{pmatrix}1&0&0\\0&c&-s\\0&s&c\end{pmatrix},\]
 \[R_y=\begin{pmatrix}c&0&s\\0&1&0\\-s&0&c\end{pmatrix},\]
 \[R_z=\begin{pmatrix}c&-s&0\\s&c&0\\0&0&1\end{pmatrix}.\]
 <p>State the viewing convention when naming a spatial rotation. As before, the rightmost factor acts first. Solve \((M-I)v=0\) for the complete fixed set; it may be a line, a plane or only the origin. Use \(|\det M|\) for volume, not area.</p>''',
 r'<ol><li>Write the fixed-point equation separately from line invariance.</li><li>Find every finite gradient and check the vertical direction.</li><li>For affine lines, test the intercept; for spatial maps, retain all three coordinates.</li><li>Check exceptional parameters, the full fixed set, and the determinant scale.</li></ol>',
 ['An invariant line is not necessarily fixed point by point.','A gradient method can miss a vertical line.','A repeated direction equation is not enough when the matrix is scalar.','In three dimensions specify the rotation axis and its viewing convention.'],
 [
 ex('E-F1','1 · An invariant family with only one fixed line',r'<p>For \(M=\begin{pmatrix}4&0\\0&1\end{pmatrix}\), find all fixed points and all invariant straight lines.</p>',
 r'<p>The fixed-point equations give \(4x=x\), hence \(x=0\) with any y-coordinate. Every horizontal line \(y=c\) is invariant: \((x,c)\mapsto(4x,c)\), and the map covers the same line. A vertical line \(x=c\) maps to \(X=4c\), so it is invariant only when \(c=0\). A non-horizontal, non-vertical line has its gradient divided by 4, so none is invariant.</p><p>Thus the complete invariant lines are \(y=c\) for all real \(c\), and \(x=0\). Only the latter is fixed point by point.</p>'),
 ex('E-F2','2 · Retain the vertical direction',r'<p>Find all invariant lines through the origin for \(M=\begin{pmatrix}3&0\\4&-1\end{pmatrix}\), and describe the motion on them.</p>',
 r'<p>For \(v=(1,m)^T\), collinearity gives \(4-m=3m\), so \(m=1\). The vertical direction also works: \(M(0,1)^T=(0,-1)^T\). Therefore the lines are \(y=x\) and \(x=0\). Points on the first are scaled by 3 from the origin; points on the second are reversed through the origin. Solving \(Mv=v\) gives only \((0,0)\).</p>'),
 ex('E-F3','3 · A repeated direction and an exceptional matrix',r'<p>For \(M=\begin{pmatrix}t&2\\-1&1\end{pmatrix}\), \(t\ne-2\), classify the number of invariant lines through the origin.</p>',
 r'<p>The vertical direction is not invariant because its image has x-coordinate 2. The finite gradients satisfy</p>\[2m^2+(t-1)m+1=0.\]<p>The discriminant is \((t-1)^2-8\). There are no invariant lines for \(1-2\sqrt2&lt;t&lt;1+2\sqrt2\), one for \(t=1\pm2\sqrt2\), and two outside that interval, with the stated exclusion \(t=-2\). The off-diagonal entry 2 is non-zero, so a repeated root cannot hide a scalar matrix. The excluded value has zero determinant and needs a different, singular-map interpretation.</p>'),
 ex('E-F4','4 · A rotation and reflection in space',rf'<p>Rotate anticlockwise through \(\pi/2\) about the positive z-axis (viewed towards the origin), then reflect in the xy-plane. Find the composite, the image of \((2,-1,3)\), and its fixed set.</p>',
 rf'<p>The reflection multiplies the third coordinate by \(-1\). The composite is</p>\[M={tex(space)}.\]<p>It sends \((2,-1,3)\) to \((1,2,-3)\). The fixed equations are \(-y=x,\ x=y,\ -z=z\), giving only the origin. The determinant is \(-1\): orientation reverses, while volume is preserved. Each factor is orthogonal, so distances are also preserved.</p>')
 ])
]
