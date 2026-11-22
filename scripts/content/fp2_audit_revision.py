"""Bind reviewed display edits before checking against the original audit fixtures."""
from hashlib import sha256
import json
from pathlib import Path


# Semantic JSON digests preserve all values and the order of the answer choices.
REVISIONS = {
    "9231-fp2-complex": (
        "1.0.0", "bfce2b98586d8dd14090823630ea35838b963a628743b8cf612c43c49c4280cf",
        "1.0.1", "9af1663bf9108033c823e957dfad1e8ad47b100a90a8407b15c6e1fdf5ccaacb",
    ),
    "9231-fp2-differentiation": (
        "1.0.0", "5214b489c7adcd0c7df725e7e4d1b8ce9e34e2e811b2f8d1925b1cd09f77b095",
        "1.0.1", "838d10ca8bed3062c1f4c2003eda37e0bbb39bead089311f4059ef17700e7919",
    ),
    "9231-fp2-hyperbolic": (
        "1.0.0", "fd71096496ab616d4e7a8f1b9b3665c6d4b970eff592cf25ee4cdbd84dd4d6b3",
        "1.0.1", "65cbc25223c30f736a222b77688ba906647a2f659df38b5414d375a06b066954",
    ),
    "9231-fp2-integration": (
        "1.0.0", "1e93def2013bb4f3b51477b97fbc1aaed7b300a75eee21a563eddf6793e273ab",
        "1.0.1", "5a4ad3c6380b5b26074efa7c4d612df02f7f3888200d3e04d54207b0d55ec52b",
    ),
    "9231-fp2-matrices2": (
        "1.0.1", "64d600924832e9dce013cd5adef0f40eee89ec8059121a382d552ed7977aa16b",
        "1.0.2", "c7572a2c8a8ca6790eb5a772a1b56a2e1f741c699123ead787dd7274c935f86d",
    ),
    "9231-fp2-ode": (
        "1.0.0", "a2d57d19e00edc1d9e3d8b226bcbde8c78c696bceaabf1c18d1c6eb620d51d90",
        "1.0.1", "5bfcfe7ab8e7d62f8a5fae41ec7ff257b2f9a29338eddf00a7b282ad9459edea",
    ),
}

# Each line names the reviewed question and field and projects the new display
# back to the previous display for the independent audit.
DISPLAY_EDITS = {
    "9231-fp2-complex": (
        ("m4u-9231-fp2-05-041-v1", "hint_html", r"\(c=\cos\theta\)", "c=cos(theta)"),
        ("m4u-9231-fp2-05-053-v1", "hint_html", r"\(\frac{1}{\cos\theta}\)", "1/cos(theta)"),
        ("m4u-9231-fp2-05-056-v1", "hint_html", r"\(\theta+\phi\)", "theta+phi"),
        ("m4u-9231-fp2-05-056-v1", "hint_html", r"\(2\theta\)", "2theta"),
        ("m4u-9231-fp2-05-056-v1", "hint_html", r"\(n\theta\)", "ntheta"),
        ("m4u-9231-fp2-05-057-v1", "hint_html", r"\((n+1)\theta\)", "(n+1)theta"),
        ("m4u-9231-fp2-05-057-v1", "hint_html", r"\(n\theta\)", "ntheta"),
    ),
    "9231-fp2-differentiation": (
        ("M4U-9231-FDIFF-M11", "prompt_html", "/(1+x)", "/(1+1x)"),
        ("M4U-9231-FDIFF-X11", "prompt_html", "w=1+2x+x^2", "w=1+2x+1x^2"),
    ),
    "9231-fp2-hyperbolic": (
        ("M4U-9231-HYP-H22", "prompt_html", r"\cosh2x=\sinh x+1", r"\cosh2x=1\sinh x+1"),
    ),
    "9231-fp2-integration": (
        ("M4U-9231-FINT-T41", "solution_html", r"\(\sqrt{\sinh^2 u}=\sinh u\)", r"sqrt(sin\(h^{2}\)u)=sinh u"),
        ("M4U-9231-FINT-A42", "answer_html", r"\(\sqrt{r^2+\left(\frac{\mathrm dr}{\mathrm d\theta}\right)^2}\)", "sqrt(r²+(dr/dθ)²)"),
    ),
    "9231-fp2-matrices2": tuple(
        (f"maths4u_9231_fp2_02_{number:03d}_v1", "solution_html", r"\((A-I)\mathbf", r"\((A-1I)\mathbf")
        for number in (3, 16, 18, 43, 55)
    ),
    "9231-fp2-ode": (
        ("M4U-9231-FODE-C11", "prompt_html", r"\prime}+y^{\prime}", r"\prime}+1y^{\prime}"),
        ("M4U-9231-FODE-C11", "prompt_html", "Ae^{x}", "Ae^{1x}"),
        ("M4U-9231-FODE-C12", "prompt_html", r"\prime}-y^{\prime}", r"\prime}-1y^{\prime}"),
        ("M4U-9231-FODE-C12", "prompt_html", "Be^{-x}", "Be^{-1x}"),
        ("M4U-9231-FODE-P21", "prompt_html", "12e^{x}", "12e^{1x}"),
        ("M4U-9231-FODE-P21", "prompt_html", "Ke^{x}", "Ke^{1x}"),
        ("M4U-9231-FODE-S21", "prompt_html", "+y=2y^2", "+1y=2y^2"),
        ("M4U-9231-FODE-S21", "prompt_html", r"\(y(0)=\frac{1}{3}\)", r"y(0)=\frac{1}{3}"),
        ("M4U-9231-FODE-S21", "prompt_html", "Ce^{x}", "Ce^{1x}"),
        ("M4U-9231-FODE-S22", "prompt_html", r"\(y(0)=\frac{1}{2}\)", r"y(0)=\frac{1}{2}"),
        ("m4u-9231-fp2-06-021-v1", "solution_html", r"m=-2\pm i", r"m=-2\pm 1i"),
        ("m4u-9231-fp2-06-057-v1", "solution_html", r"m=-2\pm i", r"m=-2\pm 1i"),
        ("m4u-9231-fp2-06-067-v1", "solution_html", r"m=-3\pm i", r"m=-3\pm 1i"),
        ("m4u-9231-fp2-06-068-v1", "solution_html", r"m=-1\pm i", r"m=-1\pm 1i"),
    ),
}


def package_digest(package):
    canonical = json.dumps(package, ensure_ascii=False, separators=(",", ":"))
    return sha256(canonical.encode("utf-8")).hexdigest()


def read_audited_package(path):
    """Return the original audit view only after verifying the exact revised package."""
    package = json.loads(Path(path).read_text(encoding="utf-8"))
    key = package["key"]
    previous_version, previous_digest, revised_version, revised_digest = REVISIONS[key]
    if package["version"] == revised_version:
        if package_digest(package) != revised_digest:
            raise ValueError(f"{key} {revised_version} does not match the reviewed package")
        questions = {question["id"]: question for question in package["questions"]}
        for uid, field, revised, previous in DISPLAY_EDITS[key]:
            question = questions[uid]
            if question[field].count(revised) != 1:
                raise ValueError(f"{uid} {field} does not match the reviewed display edit")
            question[field] = question[field].replace(revised, previous)
        package["version"] = previous_version
    if package["version"] != previous_version or package_digest(package) != previous_digest:
        raise ValueError(f"{key} {package['version']} differs from the original audit")
    return package
