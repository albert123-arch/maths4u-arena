"""Package only verified, explicitly listed content. Never include runtime files."""
import hashlib
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path('.local/content-bank').resolve()
verified = json.loads((root / 'package-verified.json').read_text(encoding='utf8'))
output = root / 'maths4u-five-courses.zip'
with ZipFile(output, 'w', ZIP_DEFLATED, compresslevel=6) as archive:
    for name in verified['entries']:
        source = (root / 'publish' / name).resolve()
        source.relative_to(root / 'publish')
        archive.write(source, 'publish/' + name)
    for name in ['report.json', 'inventory.json', 'package-verified.json']:
        archive.write(root / name, name)
    archive.write('docs/FIVE-COURSE-IMPORT.md', 'RELEASE.md')
with ZipFile(output) as archive:
    assert archive.testzip() is None
    for name in verified['entries']:
        assert hashlib.sha256(archive.read('publish/' + name)).digest() == hashlib.sha256((root / 'publish' / name).read_bytes()).digest()
with output.open('rb') as stream:
    checksum = hashlib.file_digest(stream, 'sha256').hexdigest()
(root / 'maths4u-five-courses.zip.sha256').write_text(checksum + '  maths4u-five-courses.zip\n', encoding='ascii')
print(json.dumps({'archive': str(output), 'bytes': output.stat().st_size, 'sha256': checksum, 'entriesVerified': len(verified['entries'])}))
