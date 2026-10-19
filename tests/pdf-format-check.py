"""Inspect actual exported PDF font resources and heading/body font use."""
import io
import sys
from pypdf import PdfReader
from fontTools.ttLib import TTFont

reader = PdfReader(sys.argv[1])
weights = {}
seen_bold = seen_normal = False
for page in reader.pages:
    for font in page['/Resources']['/Font'].values():
        obj = font.get_object()
        descriptor = obj['/DescendantFonts'][0].get_object()['/FontDescriptor'].get_object()
        stream = descriptor['/FontFile2'].get_object().get_data()
        weights[font.idnum] = TTFont(io.BytesIO(stream))['OS/2'].usWeightClass

    def inspect(text, cm, tm, font, size):
        global seen_bold, seen_normal
        if not text.strip() or font is None:
            return
        weight = weights[font.indirect_reference.idnum]
        if text.strip() == 'PDF_SCENE_HEADING':
            assert weight == 400, ('scene title must be regular', text, weight)
        elif text.strip() == 'PDF_PANEL_HEADING':
            assert weight == 400, ('panel title must be regular', text, weight)
        elif text.strip() in ('Scene', 'Panel', 'Dialogue', 'Notes', 'Action', 'Slugging', 'Transition'):
            assert weight >= 700, (text, weight)
            seen_bold = True
        elif 'Introduction' in text or 'LINE_' in text or 'NOTES_SENTINEL' in text:
            assert weight == 400, (text, weight)
            seen_normal = True

    page.extract_text(visitor_text=inspect)

assert seen_bold
assert 400 in weights.values() and 700 in weights.values()
print('PDF embeds regular/bold faces and uses bold headings with regular content.')
