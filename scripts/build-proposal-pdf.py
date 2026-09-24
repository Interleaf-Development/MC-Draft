#!/usr/bin/env python3
"""Build the downloadable Chinese proposal from the website's canonical content.

Requires Python packages reportlab, lxml, svglib, pypdf and Pillow, plus Node.js.
Screenshot inputs are deliberately explicit: refresh the six PNGs in
dist/proposal/assets/pdf when the demonstrated interface changes, then rerun.

Usage: python3 scripts/build-proposal-pdf.py [--node /path/to/node]
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from xml.sax.saxutils import escape

from lxml import etree, html
from PIL import Image as PILImage
from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable, Image, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate,
    Spacer, Table, TableStyle,
)
from svglib.svglib import svg2rlg


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/pdf/MathConcept-Proposal-V1.pdf"
PUBLIC_OUTPUT = ROOT / "dist/proposal/MathConcept-Proposal-V1.pdf"
WORK = ROOT / "tmp/pdfs"
ASSETS = ROOT / "dist/proposal/assets/pdf"
DEMOS = ("student", "teacher", "game", "operations", "billing", "parent")
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN = 43
CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
INK = colors.HexColor("#26272B")
MUTED = colors.HexColor("#64666B")
RED = colors.HexColor("#B02031")
LINE = colors.HexColor("#D9DBDF")


def font_path(env_name: str, default: str) -> str:
    path = os.environ.get(env_name, default)
    if not Path(path).is_file():
        raise FileNotFoundError(f"Set {env_name} to a TrueType Chinese font: {path}")
    return path


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Proposal", font_path("PROPOSAL_FONT", "/System/Library/Fonts/STHeiti Light.ttc"), subfontIndex=0))
    pdfmetrics.registerFont(TTFont("Proposal-Bold", font_path("PROPOSAL_BOLD_FONT", "/System/Library/Fonts/STHeiti Medium.ttc"), subfontIndex=0))
    pdfmetrics.registerFontFamily("Proposal", normal="Proposal", bold="Proposal-Bold", italic="Proposal", boldItalic="Proposal-Bold")


def load_source(node: str) -> dict:
    script = """
      import * as chinese from './dist/proposal/content.zh-HK.js';
      import {getSmartpenProposal} from './dist/proposal/smartpen-content.js';
      import {buildProposalStructure} from './dist/proposal/structure.js';
      import {shellText} from './dist/proposal/locale.js';
      const proposal=buildProposalStructure('zh-HK',chinese,getSmartpenProposal('zh-HK',chinese));
      console.log(JSON.stringify({notice:shellText.demoNotice,chapters:[proposal.overviewHTML,...proposal.chapters.slice(1).map((chapter,index)=>chinese.chapterHTML(chapter,index+1))]}));
    """
    result = subprocess.run([node, "--input-type=module", "-e", script], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def normalized(value: str) -> str:
    return re.sub(r"\s+", "", value)


def plain(element) -> str:
    return "".join(element.itertext()).strip()


def classes(element) -> set[str]:
    return set(element.get("class", "").split())


def inline(element) -> str:
    """Preserve the source inline emphasis without importing webpage layout."""
    result = escape(element.text or "")
    for child in element:
        if child.tag in ("strong", "b"):
            result += "<b>" + inline(child) + "</b>"
        elif child.tag == "br":
            result += "<br/>"
        elif child.tag in ("em", "i"):
            result += "<i>" + inline(child) + "</i>"
        elif child.tag not in ("svg", "script", "style"):
            result += inline(child)
        result += escape(child.tail or "")
    return result


class ProposalBuilder:
    def __init__(self):
        base = dict(fontName="Proposal", fontSize=10.3, leading=16.4, textColor=INK,
                    wordWrap="CJK", splitLongWords=True, alignment=TA_LEFT,
                    allowWidows=0, allowOrphans=0)
        self.styles = {
            "body": ParagraphStyle("Body", spaceAfter=8, **base),
            "h1": ParagraphStyle("Title", **{**base, "fontName": "Proposal-Bold", "fontSize": 18, "leading": 26}, spaceAfter=18, keepWithNext=True),
            "h2": ParagraphStyle("Chapter", **{**base, "fontName": "Proposal-Bold", "fontSize": 16, "leading": 23}, spaceAfter=13, keepWithNext=True),
            "h3": ParagraphStyle("Subsection", **{**base, "fontName": "Proposal-Bold", "fontSize": 12.2, "leading": 18.5}, spaceBefore=12, spaceAfter=7, keepWithNext=True),
            "h4": ParagraphStyle("Detail", **{**base, "fontName": "Proposal-Bold", "fontSize": 10.7, "leading": 16.5}, spaceBefore=8, spaceAfter=5, keepWithNext=True),
            "caption": ParagraphStyle("Caption", **{**base, "fontName": "Proposal-Bold", "fontSize": 9.3, "leading": 14, "textColor": MUTED}, spaceAfter=8, keepWithNext=True),
            "cell": ParagraphStyle("Table cell", **{**base, "fontSize": 9, "leading": 14}, spaceAfter=0),
            "small": ParagraphStyle("Small", **{**base, "fontSize": 9.3, "leading": 14.5}, spaceAfter=0),
            "notice": ParagraphStyle("Notice", **{**base, "fontSize": 8.5, "leading": 13, "textColor": RED}, spaceAfter=17),
        }
        self.expected = []
        self.demo_ids = []

    def paragraph(self, element, style="body"):
        self.expected.append(plain(element))
        return Paragraph(inline(element), self.styles[style])

    def demo(self, element):
        demo = element.xpath('.//*[@data-demo]')[0].get("data-demo")
        path = ASSETS / f"{demo}.png"
        if not path.is_file():
            raise FileNotFoundError(f"Capture the actual {demo} demo before exporting: {path}")
        self.demo_ids.append(demo)
        caption = element.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," demo-caption ")]')[0]
        with PILImage.open(path) as source:
            source_width, source_height = source.size
        # Portrait family/tablet views stay legible; dashboard screenshots span
        # the text column, never distorted or cropped in the exported document.
        max_height = 580 if demo in ("student", "parent") else 310
        scale = min(CONTENT_WIDTH / source_width, max_height / source_height)
        image = Image(str(path), width=source_width * scale, height=source_height * scale)
        image.hAlign = "CENTER"
        return [Spacer(1, 9), KeepTogether([self.paragraph(caption, "caption"), image]), Spacer(1, 13)]

    def table(self, element):
        rows = []
        for row in element.xpath('./thead/tr | ./tbody/tr | ./tr'):
            cells = []
            for cell in row:
                self.expected.append(plain(cell))
                value = inline(cell)
                if cell.tag == "th":
                    value = f"<b>{value}</b>"
                cells.append(Paragraph(value, self.styles["cell"]))
            rows.append(cells)
        widths = [CONTENT_WIDTH * x for x in (0.205, 0.435, 0.36)]
        table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#ECEEF1")),
            ("GRID", (0, 0), (-1, -1), 0.45, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]))
        return [table, Spacer(1, 10)]

    def smartpen_flow(self, element):
        caption = element.find("figcaption")
        cells = []
        for item in element.xpath('./ol/li'):
            svg = item.find('.//svg')
            svg = etree.fromstring(etree.tostring(svg))
            svg.set("xmlns", "http://www.w3.org/2000/svg")
            svg.set("width", "144")
            svg.set("height", "104")
            svg.set("stroke", "#44474D")
            for shape in svg.iter():
                if shape.get("stroke") == "currentColor":
                    shape.set("stroke", "#44474D")
                if shape.get("fill") == "currentColor":
                    shape.set("fill", "#44474D")
                if "flow-accent" in classes(shape):
                    shape.set("stroke", "#B02031")
            art = svg2rlg(io.BytesIO(etree.tostring(svg)))
            art.scale(.78, .78)
            art.width *= .78
            art.height *= .78
            title = item.find('.//strong')
            description = item.find('.//p')
            cells.append([art, self.paragraph(title, "h4"), self.paragraph(description, "small")])
        table = Table([cells], colWidths=[CONTENT_WIDTH / 3] * 3)
        table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ]))
        return [Spacer(1, 9), KeepTogether([self.paragraph(caption, "caption"), table]), Spacer(1, 10)]

    def walk(self, element):
        tag = element.tag
        cls = classes(element)
        if cls & {"document-type", "document-metadata", "document-links", "solution-switch", "learning-comparison-heading"}:
            return []
        if tag in ("svg", "script", "style", "nav"):
            return []
        if "demo-wrap" in cls:
            return self.demo(element)
        if "smartpen-flow" in cls:
            return self.smartpen_flow(element)
        if tag == "table":
            return self.table(element)
        if tag == "p":
            return [self.paragraph(element)] if plain(element) else []
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
            style = tag if tag in self.styles else "h4"
            return [self.paragraph(element, style)]
        if tag == "li":
            self.expected.append(plain(element))
            return [Paragraph("• " + inline(element), self.styles["body"])]
        result = []
        if element.get("id") == "learning-solution-2":
            result.extend([Spacer(1, 9), HRFlowable(width="100%", thickness=.5, color=LINE), Spacer(1, 4)])
        for child in element:
            result.extend(self.walk(child))
        return result


def page_chrome(canvas, doc):
    canvas.saveState()
    canvas.setFont("Proposal-Bold", 9)
    canvas.setFillColor(INK)
    canvas.drawString(MARGIN, PAGE_HEIGHT - 30, "MathConcept Proposal V1")
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(.45)
    canvas.line(MARGIN, PAGE_HEIGHT - 39, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 39)
    canvas.setFont("Proposal", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(PAGE_WIDTH - MARGIN, 25, str(doc.page))
    canvas.restoreState()


def verify(builder, source):
    reader = PdfReader(OUTPUT)
    extracted = "\n".join(page.extract_text() for page in reader.pages)
    normalized_pdf = normalized(extracted)
    missing = [segment for segment in builder.expected if normalized(segment) not in normalized_pdf]
    if missing:
        raise AssertionError("Source text missing from PDF: " + repr(missing))
    if builder.demo_ids != ["student", "teacher", "game", "operations", "billing", "parent"]:
        raise AssertionError(f"Unexpected demo order: {builder.demo_ids}")
    pen = normalized_pdf.index("方案一：紙本作答，筆跡即時同步")
    tablet = normalized_pdf.index("方案二：平板無紙化學習")
    if pen >= tablet:
        raise AssertionError("Smartpen must precede tablet in the export")
    for forbidden in ("提交對象", "文件類別", "文件狀態", "系統功能建議", "初稿，供討論用"):
        if forbidden in extracted:
            raise AssertionError(f"Removed cover metadata found: {forbidden}")
    images = sum(len(page.images) for page in reader.pages)
    if images != len(DEMOS):
        raise AssertionError(f"Expected six demo images, found {images}")
    WORK.mkdir(parents=True, exist_ok=True)
    (WORK / "proposal-pdf-source.json").write_text(json.dumps({"segments": builder.expected, "demo_ids": builder.demo_ids}, ensure_ascii=False, indent=2))
    (WORK / "proposal-pdf-extracted.txt").write_text(extracted)
    report = {"pages": len(reader.pages), "source_segments_verified": len(builder.expected), "demo_images": images, "smartpen_before_tablet": True, "bytes": OUTPUT.stat().st_size}
    (WORK / "proposal-pdf-qa.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    return report


def write_manifest(report):
    paths = [
        "scripts/build-proposal-pdf.py",
        *[f"dist/proposal/{name}" for name in (
            "content.zh-HK.js", "smartpen-content.js", "structure.js", "shared-knowledge.js",
            "smartpen-flow.js", "smartpen-writing-demo.js", "locale.js", "assets/mathconcept-logo.png",
        )],
        *[f"dist/proposal/assets/pdf/{demo}.png" for demo in DEMOS],
    ]
    digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
    manifest = {
        "version": 1,
        "pdf": str(PUBLIC_OUTPUT.relative_to(ROOT)),
        "pdfSha256": digest(PUBLIC_OUTPUT),
        "pageCount": report["pages"],
        "dependencies": {path: digest(ROOT / path) for path in paths},
    }
    (PUBLIC_OUTPUT.parent / "pdf-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--node", default=os.environ.get("NODE", "node"))
    args = parser.parse_args()
    register_fonts()
    source = load_source(args.node)
    builder = ProposalBuilder()
    notice = html.fragment_fromstring(f"<p>{escape(source['notice'])}</p>")
    story = [builder.paragraph(notice, "notice")]
    for index, chapter_html in enumerate(source["chapters"]):
        if index:
            story.append(PageBreak())
        fragment = html.fragment_fromstring(chapter_html, create_parent="div")
        story.extend(builder.walk(fragment))
    # Fail rather than quietly rendering missing Chinese characters.
    for font_name in ("Proposal", "Proposal-Bold"):
        supported = pdfmetrics.getFont(font_name).face.charToGlyph
        unsupported = sorted({c for s in builder.expected for c in s if not c.isspace() and ord(c) not in supported})
        if unsupported:
            raise ValueError(f"{font_name} is missing glyphs: {unsupported}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=MARGIN, rightMargin=MARGIN,
                            topMargin=57, bottomMargin=44,
                            title="MathConcept Proposal V1", author="MathConcept", subject="教學及中心管理系統建議書")
    doc.build(story, onFirstPage=page_chrome, onLaterPages=page_chrome)
    report = verify(builder, source)
    shutil.copyfile(OUTPUT, PUBLIC_OUTPUT)
    write_manifest(report)
    print(f"Built {PUBLIC_OUTPUT}")


if __name__ == "__main__":
    main()
