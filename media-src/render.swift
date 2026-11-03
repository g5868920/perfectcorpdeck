// Original procedural media for the Creator-Aware Reel Agent concept demo.
// Every frame is drawn from code with CoreGraphics (no photos, no stock assets).
// Build:  swiftc -O -swift-version 5 render.swift -o build/render && build/render build ../public/media
import AVFoundation
import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let W = 720, H = 1280
let FW = CGFloat(W), FH = CGFloat(H)
let FPS: Int32 = 30
let TOTAL: Double = 20.0
let XFADE: Double = 0.4

// MARK: - helpers

func C(_ hex: UInt32, _ a: CGFloat = 1) -> CGColor {
    CGColor(red: CGFloat((hex >> 16) & 0xff) / 255, green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255, alpha: a)
}
let space = CGColorSpace(name: CGColorSpace.sRGB)!
func ease(_ x: Double) -> Double { let c = max(0, min(1, x)); return c * c * (3 - 2 * c) }
func lerp(_ a: CGFloat, _ b: CGFloat, _ t: Double) -> CGFloat { a + (b - a) * CGFloat(t) }

struct RNG { var s: UInt64
    mutating func next() -> Double { s = s &* 6364136223846793005 &+ 1442695040888963407; return Double((s >> 33) & 0xffffff) / Double(0xffffff) }
    mutating func r(_ a: Double, _ b: Double) -> CGFloat { CGFloat(a + (b - a) * next()) }
}

func makeContext(_ w: Int = W, _ h: Int = H) -> CGContext {
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: space,
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    ctx.translateBy(x: 0, y: CGFloat(h)); ctx.scaleBy(x: 1, y: -1)
    return ctx
}
func drawImage(_ ctx: CGContext, _ img: CGImage, _ r: CGRect, alpha: CGFloat = 1) {
    ctx.saveGState(); ctx.setAlpha(alpha)
    ctx.translateBy(x: 0, y: r.maxY + r.minY); ctx.scaleBy(x: 1, y: -1)
    ctx.draw(img, in: r); ctx.restoreGState()
}
func vgrad(_ ctx: CGContext, _ r: CGRect, _ stops: [(CGFloat, CGColor)]) {
    let g = CGGradient(colorsSpace: space, colors: stops.map { $0.1 } as CFArray, locations: stops.map { $0.0 })!
    ctx.saveGState(); ctx.clip(to: r)
    ctx.drawLinearGradient(g, start: CGPoint(x: r.midX, y: r.minY), end: CGPoint(x: r.midX, y: r.maxY), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    ctx.restoreGState()
}
func lgradPath(_ ctx: CGContext, _ p: CGPath, _ a: CGPoint, _ b: CGPoint, _ stops: [(CGFloat, CGColor)]) {
    let g = CGGradient(colorsSpace: space, colors: stops.map { $0.1 } as CFArray, locations: stops.map { $0.0 })!
    ctx.saveGState(); ctx.addPath(p); ctx.clip()
    ctx.drawLinearGradient(g, start: a, end: b, options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
    ctx.restoreGState()
}
func rgrad(_ ctx: CGContext, _ c: CGPoint, _ r: CGFloat, _ stops: [(CGFloat, CGColor)], clip: CGPath? = nil) {
    let g = CGGradient(colorsSpace: space, colors: stops.map { $0.1 } as CFArray, locations: stops.map { $0.0 })!
    ctx.saveGState(); if let clip { ctx.addPath(clip); ctx.clip() }
    ctx.drawRadialGradient(g, startCenter: c, startRadius: 0, endCenter: c, endRadius: r, options: [])
    ctx.restoreGState()
}
func glow(_ ctx: CGContext, _ c: CGPoint, _ r: CGFloat, _ hex: UInt32, _ a: CGFloat) {
    rgrad(ctx, c, r, [(0, C(hex, a)), (0.45, C(hex, a * 0.45)), (1, C(hex, 0))])
}
func circle(_ c: CGPoint, _ r: CGFloat) -> CGPath { CGPath(ellipseIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2), transform: nil) }
func ellipse(_ c: CGPoint, _ rx: CGFloat, _ ry: CGFloat) -> CGPath { CGPath(ellipseIn: CGRect(x: c.x - rx, y: c.y - ry, width: rx * 2, height: ry * 2), transform: nil) }
func fill(_ ctx: CGContext, _ p: CGPath, _ c: CGColor) { ctx.addPath(p); ctx.setFillColor(c); ctx.fillPath() }
func stroke(_ ctx: CGContext, _ p: CGPath, _ c: CGColor, _ w: CGFloat) {
    ctx.addPath(p); ctx.setStrokeColor(c); ctx.setLineWidth(w); ctx.setLineCap(.round); ctx.setLineJoin(.round); ctx.strokePath()
}
func poly(_ pts: [CGPoint]) -> CGPath { let p = CGMutablePath(); p.addLines(between: pts); p.closeSubpath(); return p }
func rrect(_ r: CGRect, _ rad: CGFloat) -> CGPath { CGPath(roundedRect: r, cornerWidth: rad, cornerHeight: rad, transform: nil) }
func P(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x, y: y) }

/// Soft rising steam: layered translucent strokes.
func steam(_ ctx: CGContext, x: CGFloat, y0: CGFloat, y1: CGFloat, t: Double, phase: Double, amp: CGFloat, alpha: CGFloat) {
    for (w, a) in [(CGFloat(34), CGFloat(0.035)), (20, 0.05), (9, 0.07), (3.5, 0.08)] {
        let p = CGMutablePath()
        var first = true
        var y = y0
        while y >= y1 {
            let k = Double((y0 - y) / (y0 - y1))
            let xx = x + CGFloat(sin(Double(y) * 0.018 + t * 1.3 + phase)) * amp * CGFloat(0.4 + k) + CGFloat(k * 18 * sin(phase))
            if first { p.move(to: P(xx, y)); first = false } else { p.addLine(to: P(xx, y)) }
            y -= 6
        }
        ctx.saveGState()
        ctx.addPath(p); ctx.setLineWidth(w); ctx.setLineCap(.round); ctx.replacePathWithStrokedPath(); ctx.clip()
        let g = CGGradient(colorsSpace: space, colors: [C(0xfff6ea, 0), C(0xfff6ea, a * alpha * 12), C(0xfff6ea, 0)] as CFArray, locations: [0, 0.35, 1])!
        ctx.drawLinearGradient(g, start: P(x, y0), end: P(x, y1), options: [])
        ctx.restoreGState()
    }
}

// MARK: - static textures (rendered once)

func woodTexture(base: UInt32, dark: UInt32, light: UInt32, seed: UInt64) -> CGImage {
    let ctx = makeContext(W + 200, H + 200)
    let w = FW + 200, h = FH + 200
    vgrad(ctx, CGRect(x: 0, y: 0, width: w, height: h), [(0, C(light)), (0.5, C(base)), (1, C(dark))])
    var rng = RNG(s: seed)
    let plank: CGFloat = 170
    var x: CGFloat = -20
    while x < w {
        let tone = rng.r(-0.06, 0.06)
        fill(ctx, CGPath(rect: CGRect(x: x, y: 0, width: plank, height: h), transform: nil), tone > 0 ? C(0xffffff, tone) : C(0x000000, -tone))
        for _ in 0..<26 {
            let gx = x + rng.r(4, Double(plank) - 4)
            let p = CGMutablePath(); p.move(to: P(gx, 0))
            var y: CGFloat = 0
            let f = rng.r(0.004, 0.012), a = rng.r(2, 9), ph = rng.r(0, 6)
            while y < h { y += 12; p.addLine(to: P(gx + a * CGFloat(sin(Double(y * f + ph))), y)) }
            stroke(ctx, p, C(dark, rng.r(0.08, 0.22)), rng.r(0.8, 2.4))
        }
        stroke(ctx, CGPath(rect: CGRect(x: x, y: -10, width: 0.1, height: h + 20), transform: nil), C(0x1a0d06, 0.5), 3)
        x += plank
    }
    return ctx.makeImage()!
}

func noiseImages() -> [CGImage] {
    var out: [CGImage] = []
    var rng = RNG(s: 99)
    for _ in 0..<6 {
        let w = 360, h = 640
        var data = [UInt8](repeating: 0, count: w * h * 4)
        for i in 0..<(w * h) {
            let v = UInt8(rng.next() * 255)
            data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = v; data[i * 4 + 3] = 255
        }
        let prov = CGDataProvider(data: Data(data) as CFData)!
        out.append(CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: w * 4, space: space,
                           bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue), provider: prov,
                           decode: nil, shouldInterpolate: true, intent: .defaultIntent)!)
    }
    return out
}

let woodWarm = woodTexture(base: 0x6f4327, dark: 0x3e2515, light: 0x8a5634, seed: 3)
let woodEvening = woodTexture(base: 0x5a3521, dark: 0x2c190e, light: 0x734528, seed: 5)
let grain = noiseImages()

func camera(_ ctx: CGContext, zoom: CGFloat, rot: CGFloat = 0, dx: CGFloat = 0, dy: CGFloat = 0, cx: CGFloat = FW / 2, cy: CGFloat = FH / 2) {
    ctx.translateBy(x: cx + dx, y: cy + dy); ctx.rotate(by: rot * .pi / 180); ctx.scaleBy(x: zoom, y: zoom); ctx.translateBy(x: -cx, y: -cy)
}

func bean(_ ctx: CGContext, _ c: CGPoint, _ ang: CGFloat, _ s: CGFloat = 1) {
    ctx.saveGState(); ctx.translateBy(x: c.x, y: c.y); ctx.rotate(by: ang); ctx.scaleBy(x: s, y: s)
    fill(ctx, ellipse(P(3, 5), 15, 11), C(0x120804, 0.35))
    let b = ellipse(.zero, 15, 10.5)
    rgrad(ctx, P(-4, -4), 20, [(0, C(0x6b3d20)), (1, C(0x2e170a))], clip: b)
    let crack = CGMutablePath(); crack.move(to: P(-12, 0)); crack.addCurve(to: P(12, 0), control1: P(-4, -5), control2: P(4, 5))
    stroke(ctx, crack, C(0x140904, 0.9), 2.2)
    ctx.restoreGState()
}

// MARK: - scenes. Each draws a full frame for local time t (seconds) of duration d.

func sceneCoffeeCloseUp(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / d
    ctx.saveGState()
    camera(ctx, zoom: 1.0 + 0.11 * CGFloat(ease(p)), rot: CGFloat(-1.5 + 3 * p))
    drawImage(ctx, woodWarm, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200))
    // morning light beam
    ctx.saveGState()
    let shift = CGFloat(p * 60)
    let beam = poly([P(-200 + shift, -100), P(260 + shift, -100), P(980 + shift, 1400), P(420 + shift, 1400)])
    lgradPath(ctx, beam, P(0 + shift, 300), P(500 + shift, 200), [(0, C(0xffd9a0, 0)), (0.5, C(0xffe2b0, 0.16)), (1, C(0xffd9a0, 0))])
    ctx.restoreGState()
    let c = P(360, 650)
    for (pos, ang, s) in [(P(120, 300), 0.4, 1.0), (P(170, 360), 1.9, 0.9), (P(585, 1010), 2.6, 1.05), (P(630, 950), 0.9, 0.95), (P(95, 1080), 1.2, 1.0), (P(560, 270), 2.2, 0.85), (P(150, 1130), 0.1, 0.9)] as [(CGPoint, CGFloat, CGFloat)] {
        bean(ctx, pos, ang, s)
    }
    // saucer
    rgrad(ctx, P(c.x + 22, c.y + 30), 290, [(0, C(0x120804, 0.55)), (0.75, C(0x120804, 0.25)), (1, C(0x120804, 0))])
    rgrad(ctx, P(c.x - 50, c.y - 60), 300, [(0, C(0xfbf5ec)), (0.8, C(0xe8dccb)), (1, C(0xcdbca6))], clip: circle(c, 232))
    stroke(ctx, circle(c, 172), C(0x8a6d50, 0.18), 6)
    // handle
    let handle = rrect(CGRect(x: c.x + 132, y: c.y - 28, width: 96, height: 56), 28)
    fill(ctx, rrect(CGRect(x: c.x + 140, y: c.y - 16, width: 96, height: 56), 28), C(0x2a1408, 0.25))
    lgradPath(ctx, handle, P(c.x + 130, c.y - 30), P(c.x + 130, c.y + 30), [(0, C(0xfdf8f0)), (1, C(0xd8cab6))])
    fill(ctx, rrect(CGRect(x: c.x + 168, y: c.y - 11, width: 40, height: 22), 11), C(0xb59f86))
    // cup
    rgrad(ctx, P(c.x + 18, c.y + 26), 190, [(0, C(0x1a0c05, 0.5)), (1, C(0x1a0c05, 0))])
    rgrad(ctx, P(c.x - 40, c.y - 50), 200, [(0, C(0xffffff)), (0.7, C(0xf1e8dc)), (1, C(0xd4c4ae))], clip: circle(c, 152))
    // coffee
    rgrad(ctx, P(c.x - 10, c.y - 8), 130, [(0, C(0xa8693a)), (0.45, C(0x8a5028)), (0.85, C(0x5c3016)), (1, C(0x3b1d0c))], clip: circle(c, 128))
    stroke(ctx, circle(c, 121), C(0xc68f58, 0.55), 9)
    // latte art: rosetta heart slowly turning
    ctx.saveGState(); ctx.addPath(circle(c, 126)); ctx.clip()
    ctx.translateBy(x: c.x, y: c.y + 6); ctx.rotate(by: CGFloat(-0.15 + 0.12 * p))
    for (i, s) in [1.0, 0.82, 0.64, 0.46].enumerated() {
        let sc = CGFloat(s) * 78
        let heart = CGMutablePath()
        heart.move(to: P(0, sc * 0.85))
        heart.addCurve(to: P(-sc, -sc * 0.15), control1: P(-sc * 0.5, sc * 0.55), control2: P(-sc, sc * 0.25))
        heart.addCurve(to: P(0, -sc * 0.35), control1: P(-sc, -sc * 0.75), control2: P(-sc * 0.15, -sc * 0.8))
        heart.addCurve(to: P(sc, -sc * 0.15), control1: P(sc * 0.15, -sc * 0.8), control2: P(sc, -sc * 0.75))
        heart.addCurve(to: P(0, sc * 0.85), control1: P(sc, sc * 0.25), control2: P(sc * 0.5, sc * 0.55))
        fill(ctx, heart, i % 2 == 0 ? C(0xf6e6cc, 0.96) : C(0xb8794a, 0.9))
    }
    let tail = CGMutablePath(); tail.move(to: P(0, -100)); tail.addLine(to: P(0, 70))
    stroke(ctx, tail, C(0xf6e6cc, 0.85), 5)
    ctx.restoreGState()
    // rim highlight
    let arc = CGMutablePath(); arc.addArc(center: c, radius: 146, startAngle: 3.4, endAngle: 4.9, clockwise: false)
    stroke(ctx, arc, C(0xffffff, 0.8), 4)
    steam(ctx, x: c.x - 40, y0: c.y - 30, y1: 140, t: t, phase: 0, amp: 26, alpha: 1)
    steam(ctx, x: c.x + 30, y0: c.y - 10, y1: 200, t: t, phase: 2.1, amp: 22, alpha: 0.8)
    steam(ctx, x: c.x - 5, y0: c.y - 60, y1: 90, t: t * 0.8, phase: 4.2, amp: 34, alpha: 0.7)
    ctx.restoreGState()
}

func sceneCoffeeAlt(_ ctx: CGContext, _ t: Double, _ d: Double) { sceneFrenchPress(ctx, t, d) }

func scenePourOver(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / d
    ctx.saveGState()
    camera(ctx, zoom: 1.04 + 0.08 * CGFloat(ease(p)), dx: CGFloat(-10 + 20 * p), cy: 640)
    vgrad(ctx, CGRect(x: -100, y: -100, width: FW + 200, height: 1200), [(0, C(0x140c08)), (0.6, C(0x2e1c12)), (1, C(0x3c2416))])
    glow(ctx, P(620, 260), 520, 0xffb067, 0.22)
    var rng = RNG(s: 21)
    for _ in 0..<16 {
        let x = rng.r(-40, 760) + CGFloat(sin(t * 0.4 + rng.next() * 6)) * 8 - CGFloat(p * 30)
        let y = rng.r(40, 820), r = rng.r(18, 74)
        glow(ctx, P(x, y), r, rng.next() > 0.5 ? 0xffc27a : 0xffe3b0, rng.r(0.10, 0.30))
    }
    // counter
    vgrad(ctx, CGRect(x: -100, y: 990, width: FW + 200, height: 400), [(0, C(0x7a4b2c)), (0.15, C(0x5e3820)), (1, C(0x2e1a0e))])
    stroke(ctx, CGPath(rect: CGRect(x: -100, y: 990, width: FW + 200, height: 0.1), transform: nil), C(0xc08a5a, 0.55), 3)
    rgrad(ctx, P(330, 1000), 230, [(0, C(0x0e0603, 0.55)), (1, C(0x0e0603, 0))])
    // glass server with rising coffee
    let server = CGMutablePath()
    server.move(to: P(250, 760)); server.addLine(to: P(410, 760))
    server.addCurve(to: P(460, 960), control1: P(470, 800), control2: P(472, 920))
    server.addQuadCurve(to: P(420, 990), control: P(458, 990))
    server.addLine(to: P(240, 990))
    server.addQuadCurve(to: P(200, 960), control: P(202, 990))
    server.addCurve(to: P(250, 760), control1: P(188, 920), control2: P(190, 800))
    server.closeSubpath()
    fill(ctx, server, C(0xffffff, 0.06))
    let level = lerp(950, 850, ease(p * 1.1))
    ctx.saveGState(); ctx.addPath(server); ctx.clip()
    vgrad(ctx, CGRect(x: 180, y: level, width: 300, height: 1000 - level), [(0, C(0x5a2e14)), (0.3, C(0x2a1208)), (1, C(0x170904))])
    fill(ctx, ellipse(P(330, level), 140, 7), C(0x8a4f26, 0.8))
    glow(ctx, P(300, level + 40), 90, 0xff9b4a, 0.18)
    ctx.restoreGState()
    stroke(ctx, server, C(0xffffff, 0.38), 3)
    let hl = CGMutablePath(); hl.move(to: P(226, 820)); hl.addCurve(to: P(222, 950), control1: P(212, 860), control2: P(214, 920))
    stroke(ctx, hl, C(0xffffff, 0.35), 6)
    // dripper
    fill(ctx, rrect(CGRect(x: 225, y: 728, width: 210, height: 22), 8), C(0xe3d6c4))
    let cone = poly([P(180, 560), P(480, 560), P(378, 732), P(282, 732)])
    lgradPath(ctx, cone, P(180, 0), P(480, 0), [(0, C(0xfff8ee)), (0.55, C(0xeee2d0)), (1, C(0xc3b19a))])
    for i in 0..<5 { let x = CGFloat(220 + i * 55); let r = CGMutablePath(); r.move(to: P(x, 574)); r.addLine(to: P(282 + CGFloat(i) * 24, 720)); stroke(ctx, r, C(0x9c8770, 0.22), 2) }
    // filter paper scallop + coffee bed
    let paper = CGMutablePath(); paper.move(to: P(186, 556))
    for i in 0..<15 { let x = 186 + CGFloat(i) * 20; paper.addQuadCurve(to: P(x + 20, 556), control: P(x + 10, 540)) }
    paper.addLine(to: P(474, 566)); paper.addLine(to: P(186, 566)); paper.closeSubpath()
    fill(ctx, paper, C(0xfaf5ea))
    fill(ctx, ellipse(P(330, 566), 138, 18), C(0x3a1d0c))
    for k in 0..<14 {
        let a = Double(k) * 0.9 + t * 0.6
        let bx = 330 + CGFloat(cos(a)) * CGFloat(20 + (k % 5) * 22), by = 566 + CGFloat(sin(a)) * 7
        fill(ctx, circle(P(bx, by), CGFloat(2 + k % 3)), C(0xc58a52, 0.55))
    }
    // drips
    for k in 0..<3 {
        let f = (t * 1.9 + Double(k) * 0.33).truncatingRemainder(dividingBy: 1)
        let y = 752 + CGFloat(f) * (level - 752)
        fill(ctx, ellipse(P(330, y), 3, 5), C(0x3b1a08, 0.9))
    }
    // gooseneck kettle
    ctx.saveGState(); ctx.translateBy(x: CGFloat(sin(t * 0.8)) * 3, y: CGFloat(sin(t * 0.6)) * 3)
    let body = rrect(CGRect(x: 470, y: 240, width: 230, height: 190), 70)
    lgradPath(ctx, body, P(470, 0), P(700, 0), [(0, C(0x3a3330)), (0.35, C(0x5d5551)), (0.7, C(0x26201d)), (1, C(0x161210))])
    fill(ctx, rrect(CGRect(x: 545, y: 214, width: 80, height: 30), 12), C(0x2a2422))
    fill(ctx, circle(P(585, 204), 14), C(0xb98a5a))
    let handle = CGMutablePath(); handle.move(to: P(690, 270)); handle.addCurve(to: P(700, 420), control1: P(760, 280), control2: P(760, 410))
    stroke(ctx, handle, C(0x2b2522), 20)
    let spout = CGMutablePath(); spout.move(to: P(490, 400)); spout.addCurve(to: P(404, 300), control1: P(430, 420), control2: P(392, 370))
    spout.addCurve(to: P(376, 478), control1: P(414, 250), control2: P(372, 420))
    stroke(ctx, spout, C(0x2a2321), 17)
    stroke(ctx, spout, C(0x7d736c, 0.45), 4)
    ctx.restoreGState()
    // water stream
    let wob = CGFloat(sin(t * 9)) * 2
    let st = CGMutablePath(); st.move(to: P(376, 484)); st.addCurve(to: P(340, 566), control1: P(372 + wob, 510), control2: P(346 - wob, 540))
    stroke(ctx, st, C(0xc8a27a, 0.55), 5)
    stroke(ctx, st, C(0xffffff, 0.55), 1.6)
    steam(ctx, x: 300, y0: 548, y1: 220, t: t, phase: 1.3, amp: 24, alpha: 0.9)
    steam(ctx, x: 360, y0: 548, y1: 260, t: t, phase: 3.3, amp: 20, alpha: 0.7)
    ctx.restoreGState()
}

func sceneFrenchPress(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / d
    ctx.saveGState()
    camera(ctx, zoom: 1.10 - 0.06 * CGFloat(ease(p)), dx: CGFloat(12 - 24 * p), cy: 660)
    // bright daylight kitchen, greenery
    vgrad(ctx, CGRect(x: -100, y: -100, width: FW + 200, height: 1200), [(0, C(0xf2ead8)), (0.55, C(0xe2d6bd)), (1, C(0xcdbf9f))])
    glow(ctx, P(120, 180), 620, 0xfff6dc, 0.85)
    var rng = RNG(s: 8)
    for _ in 0..<9 {
        ctx.saveGState()
        let lx = rng.r(-60, 200), ly = rng.r(260, 900)
        ctx.translateBy(x: lx + CGFloat(sin(t * 0.7 + Double(ly))) * 4, y: ly); ctx.rotate(by: rng.r(-0.9, 0.4))
        fill(ctx, ellipse(.zero, rng.r(60, 110), rng.r(24, 40)), C(0x6f8a52, rng.r(0.35, 0.6)))
        ctx.restoreGState()
    }
    for _ in 0..<7 {
        ctx.saveGState()
        ctx.translateBy(x: rng.r(560, 780), y: rng.r(120, 600)); ctx.rotate(by: rng.r(0.2, 1.4))
        fill(ctx, ellipse(.zero, rng.r(50, 90), rng.r(18, 30)), C(0x87a067, rng.r(0.25, 0.45)))
        ctx.restoreGState()
    }
    // counter (light oak)
    vgrad(ctx, CGRect(x: -100, y: 1000, width: FW + 200, height: 400), [(0, C(0xd9b88c)), (0.1, C(0xc29a6a)), (1, C(0x8f6a42))])
    stroke(ctx, CGPath(rect: CGRect(x: -100, y: 1000, width: FW + 200, height: 0.1), transform: nil), C(0xffffff, 0.6), 3)
    rgrad(ctx, P(370, 1006), 230, [(0, C(0x3a2610, 0.45)), (1, C(0x3a2610, 0))])
    // press
    let glass = CGRect(x: 240, y: 520, width: 250, height: 470)
    let mesh = lerp(640, 820, ease(p * 1.05))
    ctx.saveGState(); ctx.clip(to: glass)
    vgrad(ctx, CGRect(x: 240, y: 600, width: 250, height: mesh - 600), [(0, C(0x8a5a32, 0.75)), (1, C(0x6a3c1c, 0.8))])
    vgrad(ctx, CGRect(x: 240, y: mesh, width: 250, height: 990 - mesh), [(0, C(0x3a1c0c)), (1, C(0x1c0c04))])
    vgrad(ctx, CGRect(x: 240, y: 592, width: 250, height: 22), [(0, C(0xe6b886)), (1, C(0xb07a48))])
    for k in 0..<30 { let gx = 245 + CGFloat(k * 8); fill(ctx, circle(P(gx, mesh + 12 + CGFloat((k * 37) % 120)), 2.2), C(0x120602, 0.5)) }
    ctx.restoreGState()
    fill(ctx, CGPath(rect: glass, transform: nil), C(0xffffff, 0.08))
    stroke(ctx, CGPath(rect: glass, transform: nil), C(0xffffff, 0.65), 3)
    fill(ctx, CGPath(rect: CGRect(x: 258, y: 540, width: 10, height: 430), transform: nil), C(0xffffff, 0.35))
    // mesh disc
    fill(ctx, rrect(CGRect(x: 244, y: mesh - 5, width: 242, height: 10), 4), C(0xb8b8b8))
    // chrome frame
    for y in [CGFloat(500), 980] { lgradPath(ctx, rrect(CGRect(x: 226, y: y, width: 278, height: 24), 8), P(226, 0), P(504, 0), [(0, C(0x8d8d8d)), (0.4, C(0xf4f4f4)), (1, C(0x7a7a7a))]) }
    for x in [CGFloat(232), 486] { fill(ctx, CGPath(rect: CGRect(x: x, y: 520, width: 12, height: 470), transform: nil), C(0xd6d6d6, 0.9)) }
    // handle
    let h = CGMutablePath(); h.move(to: P(500, 590)); h.addCurve(to: P(500, 900), control1: P(610, 600), control2: P(610, 890))
    stroke(ctx, h, C(0x1f1f1f), 26)
    // rod + knob (moves with mesh)
    let knob = mesh - 330
    fill(ctx, CGPath(rect: CGRect(x: 359, y: knob, width: 12, height: mesh - knob), transform: nil), C(0xcfcfcf))
    lgradPath(ctx, circle(P(365, knob), 24), P(340, 0), P(390, 0), [(0, C(0x8a8a8a)), (0.45, C(0xffffff)), (1, C(0x6a6a6a))])
    // beans bowl + scattered beans
    fill(ctx, ellipse(P(600, 1060), 100, 26), C(0x3a2610, 0.3))
    let bowl = CGMutablePath(); bowl.move(to: P(510, 1000)); bowl.addCurve(to: P(690, 1000), control1: P(520, 1090), control2: P(680, 1090)); bowl.closeSubpath()
    lgradPath(ctx, bowl, P(510, 0), P(690, 0), [(0, C(0xf7f4ee)), (1, C(0xc9c1b4))])
    for k in 0..<9 { bean(ctx, P(540 + CGFloat(k * 17), 994 + CGFloat((k * 7) % 9)), CGFloat(k), 0.8) }
    for (pos, a) in [(P(150, 1100), 0.3), (P(200, 1150), 1.8), (P(110, 1190), 2.4), (P(450, 1150), 0.9)] as [(CGPoint, CGFloat)] { bean(ctx, pos, a, 1.1) }
    steam(ctx, x: 365, y0: 500, y1: 260, t: t, phase: 0.6, amp: 18, alpha: 0.5)
    ctx.restoreGState()
}

func sceneWindowJournal(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / d
    ctx.saveGState()
    camera(ctx, zoom: 1.07, dx: CGFloat(-22 + 44 * ease(p)))
    vgrad(ctx, CGRect(x: -100, y: -100, width: FW + 200, height: 1000), [(0, C(0xb08a6a)), (1, C(0x7c5a40))])
    // window
    let win = CGRect(x: 70, y: 110, width: 580, height: 660)
    ctx.saveGState(); ctx.clip(to: win)
    vgrad(ctx, win, [(0, C(0xf7e2bd)), (0.6, C(0xf2c992)), (1, C(0xe8b47e))])
    glow(ctx, P(560, 200), 380, 0xfffbe8, 0.9)
    var rng = RNG(s: 41)
    for _ in 0..<26 {
        let x = rng.r(40, 700) + CGFloat(sin(t * 0.5 + rng.next() * 9)) * 6, y = rng.r(420, 800), r = rng.r(40, 110)
        rgrad(ctx, P(x, y), r, [(0, C(rng.next() > 0.5 ? 0x7f9358 : 0x9aa96a, 0.55)), (1, C(0x7f9358, 0))])
    }
    ctx.restoreGState()
    let frame = CGMutablePath(); frame.addRect(win); frame.move(to: P(win.midX, win.minY)); frame.addLine(to: P(win.midX, win.maxY))
    frame.move(to: P(win.minX, 420)); frame.addLine(to: P(win.maxX, 420))
    stroke(ctx, frame, C(0xf4ebde), 22)
    stroke(ctx, CGPath(rect: win.insetBy(dx: -14, dy: -14), transform: nil), C(0x5e4230, 0.5), 6)
    // sill + plant
    vgrad(ctx, CGRect(x: 40, y: 770, width: 640, height: 34), [(0, C(0xfbf3e6)), (1, C(0xd9c8b0))])
    let pot = poly([P(110, 690), P(200, 690), P(188, 772), P(122, 772)])
    lgradPath(ctx, pot, P(110, 0), P(200, 0), [(0, C(0xd2774a)), (1, C(0x8f4828))])
    for k in 0..<7 {
        ctx.saveGState(); ctx.translateBy(x: 155, y: 690); ctx.rotate(by: CGFloat(-1.3 + Double(k) * 0.42 + sin(t + Double(k)) * 0.03))
        fill(ctx, ellipse(P(0, -52), 15, 50), C(k % 2 == 0 ? 0x58743e : 0x6f8b4c))
        ctx.restoreGState()
    }
    // sheer curtain
    for k in 0..<6 {
        let c = CGMutablePath(); let x0 = CGFloat(-20 + k * 26) + CGFloat(sin(t * 0.9 + Double(k))) * 6
        c.move(to: P(x0, 60)); c.addCurve(to: P(x0 + 30, 900), control1: P(x0 + 40, 300), control2: P(x0 - 20, 640))
        stroke(ctx, c, C(0xffffff, 0.18), 30)
    }
    // light beam + dust
    let beam = poly([P(330, 160), P(650, 160), P(760, 1150), P(240, 1150)])
    lgradPath(ctx, beam, P(400, 200), P(500, 1100), [(0, C(0xfff0c8, 0.22)), (1, C(0xfff0c8, 0.0))])
    // table
    vgrad(ctx, CGRect(x: -100, y: 820, width: FW + 200, height: 600), [(0, C(0x9a643c)), (0.05, C(0x7e4f2e)), (1, C(0x3e2414))])
    stroke(ctx, CGPath(rect: CGRect(x: -100, y: 820, width: FW + 200, height: 0.1), transform: nil), C(0xe0aa76, 0.6), 3)
    // journal
    fill(ctx, poly([P(120, 918), P(612, 918), P(640, 1188), P(96, 1188)]), C(0x1c0e06, 0.35))
    let lp = poly([P(140, 896), P(360, 880), P(360, 1126), P(116, 1156)])
    let rp = poly([P(360, 880), P(586, 896), P(610, 1156), P(360, 1126)])
    lgradPath(ctx, lp, P(140, 0), P(360, 0), [(0, C(0xf7f0e3)), (0.85, C(0xebdfc9)), (1, C(0xcdbea4))])
    lgradPath(ctx, rp, P(360, 0), P(600, 0), [(0, C(0xcfc0a6)), (0.15, C(0xefe5d3)), (1, C(0xf8f2e6))])
    for i in 0..<7 {
        let y = CGFloat(918 + i * 30)
        let l = CGMutablePath(); l.move(to: P(150 - CGFloat(i) * 3, y + CGFloat(i)) ); l.addLine(to: P(350, y - 12 + CGFloat(i) * 2))
        stroke(ctx, l, C(0x9fb1c4, 0.35), 1.2)
        let r = CGMutablePath(); r.move(to: P(372, y - 12 + CGFloat(i) * 2)); r.addLine(to: P(584 + CGFloat(i) * 3, y + CGFloat(i)))
        stroke(ctx, r, C(0x9fb1c4, 0.35), 1.2)
    }
    // pre-written left page
    var hr = RNG(s: 77)
    for i in 0..<5 {
        let y = CGFloat(910 + i * 30)
        let s = CGMutablePath(); s.move(to: P(160, y))
        var x: CGFloat = 160
        let end = CGFloat(300 + hr.r(0, 40))
        while x < end { x += 4; s.addLine(to: P(x, y - 6 + CGFloat(sin(Double(x) * 0.55)) * 5 + hr.r(-1.2, 1.2))) }
        stroke(ctx, s, C(0x3b3a52, 0.65), 1.8)
    }
    // handwriting being written on the right page
    let lines = 4
    let prog = ease(p * 1.15) * Double(lines)
    var tip = P(390, 905)
    for i in 0..<lines {
        let f = max(0, min(1, prog - Double(i)))
        if f <= 0 { break }
        let y = CGFloat(906 + i * 30) + CGFloat(i)
        let x0: CGFloat = 386, x1: CGFloat = i == lines - 1 ? 500 : 566
        let xe = x0 + (x1 - x0) * CGFloat(f)
        let s = CGMutablePath(); s.move(to: P(x0, y))
        var x = x0
        while x < xe { x += 3; s.addLine(to: P(x, y - 6 + CGFloat(sin(Double(x) * 0.6 + Double(i))) * 5 + CGFloat(cos(Double(x) * 1.7)) * 1.5)) }
        stroke(ctx, s, C(0x2f2e48, 0.8), 1.9)
        tip = P(xe, y - 4)
    }
    // pen
    ctx.saveGState(); ctx.translateBy(x: tip.x, y: tip.y); ctx.rotate(by: -0.75)
    fill(ctx, rrect(CGRect(x: -4, y: -170, width: 14, height: 170), 6), C(0x1c1c22))
    fill(ctx, CGPath(rect: CGRect(x: -4, y: -36, width: 14, height: 10), transform: nil), C(0xc9a25a))
    fill(ctx, poly([P(-4, 0), P(10, 0), P(3, 14)]), C(0xc9a25a))
    ctx.restoreGState()
    // cup on the table (side view)
    ctx.saveGState(); ctx.translateBy(x: -60, y: 0)
    fill(ctx, ellipse(P(620, 900), 82, 16), C(0xd9cbb5))
    let cup = CGMutablePath(); cup.move(to: P(566, 820)); cup.addLine(to: P(674, 820)); cup.addCurve(to: P(650, 892), control1: P(674, 860), control2: P(668, 886)); cup.addLine(to: P(590, 892)); cup.addCurve(to: P(566, 820), control1: P(572, 886), control2: P(566, 860)); cup.closeSubpath()
    lgradPath(ctx, cup, P(566, 0), P(674, 0), [(0, C(0xfffaf2)), (0.6, C(0xece2d4)), (1, C(0xbfae96))])
    fill(ctx, ellipse(P(620, 820), 54, 10), C(0x6a3a1c))
    let hd = CGMutablePath(); hd.addArc(center: P(680, 846), radius: 18, startAngle: -1.3, endAngle: 1.3, clockwise: false)
    stroke(ctx, hd, C(0xe6dccd), 7)
    steam(ctx, x: 620, y0: 812, y1: 600, t: t, phase: 2.4, amp: 14, alpha: 0.6)
    ctx.restoreGState()
    // floating dust in the beam
    var dr = RNG(s: 5)
    for _ in 0..<46 {
        let bx = dr.r(260, 700), by = dr.r(200, 1100)
        let x = bx + CGFloat(sin(t * 0.4 + Double(bx))) * 14, y = by - CGFloat(t * 9).truncatingRemainder(dividingBy: 60)
        let a = 0.25 + 0.25 * sin(t * 2 + Double(by))
        fill(ctx, circle(P(x, y), dr.r(1, 2.6)), C(0xfff6dc, CGFloat(a)))
    }
    ctx.restoreGState()
}

func sceneBookClosing(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / d
    ctx.saveGState()
    camera(ctx, zoom: 1.12 - 0.1 * CGFloat(ease(p)), rot: CGFloat(1 - 2 * p))
    drawImage(ctx, woodEvening, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200))
    glow(ctx, P(160, 180), 620, 0xffb86c, 0.35)
    // book
    let spine: CGFloat = 290, top: CGFloat = 330, bot: CGFloat = 900, pw: CGFloat = 210
    let c = ease((t - 0.6) / 2.6)
    let wR = pw * CGFloat(cos(.pi * c))
    let shadowW = pw + max(wR, 0) + 12
    fill(ctx, rrect(CGRect(x: spine - pw - 6 + 18, y: top + 22, width: shadowW, height: bot - top + 12), 8), C(0x0f0703, 0.5))
    fill(ctx, rrect(CGRect(x: spine - pw - 8, y: top - 8, width: pw + 8, height: bot - top + 16), 6), C(0x3f5a4a))
    if wR > 0 { fill(ctx, rrect(CGRect(x: spine, y: top - 8, width: wR + 8, height: bot - top + 16), 6), C(0x3f5a4a)) }
    let lp = CGRect(x: spine - pw, y: top, width: pw, height: bot - top)
    lgradPath(ctx, CGPath(rect: lp, transform: nil), P(lp.minX, 0), P(lp.maxX, 0), [(0, C(0xf6eedf)), (0.85, C(0xe9dcc5)), (1, C(0xc8b79b))])
    for i in 0..<14 { let y = top + 50 + CGFloat(i) * 34; stroke(ctx, CGPath(rect: CGRect(x: lp.minX + 26, y: y, width: CGFloat(150 + (i * 37) % 40), height: 0.1), transform: nil), C(0x6b5a48, 0.35), 2.4) }
    if wR >= 0 {
        let r = CGRect(x: spine, y: top, width: wR, height: bot - top)
        let shade = CGFloat(1 - wR / pw) * 0.45
        lgradPath(ctx, CGPath(rect: r, transform: nil), P(spine, 0), P(spine + max(wR, 1), 0), [(0, C(0xc8b79b)), (0.15, C(0xece2cf)), (1, C(0xf8f2e6))])
        fill(ctx, CGPath(rect: r, transform: nil), C(0x2a1a0e, shade))
        if wR > 40 { for i in 0..<14 { let y = top + 50 + CGFloat(i) * 34; stroke(ctx, CGPath(rect: CGRect(x: spine + 24 * wR / pw, y: y, width: CGFloat(150 + (i * 53) % 40) * wR / pw, height: 0.1), transform: nil), C(0x6b5a48, 0.35), 2.4) } }
    } else {
        let r = CGRect(x: spine + wR - 8, y: top - 8, width: -wR + 8, height: bot - top + 16)
        lgradPath(ctx, rrect(r, 6), P(r.minX, 0), P(r.maxX, 0), [(0, C(0x4e6e5a)), (1, C(0x2f4538))])
        if -wR > pw * 0.8 {
            let a = CGFloat((-wR / pw - 0.8) / 0.2)
            stroke(ctx, rrect(CGRect(x: r.minX + 28, y: top + 60, width: r.width - 56, height: 130), 4), C(0xd9b46a, 0.7 * a), 2)
            fill(ctx, CGPath(rect: CGRect(x: r.minX + 60, y: top + 110, width: r.width - 120, height: 6), transform: nil), C(0xd9b46a, 0.7 * a))
        }
    }
    // ribbon
    fill(ctx, poly([P(spine - 6, bot), P(spine + 6, bot), P(spine + 8, bot + 70), P(spine, bot + 60), P(spine - 8, bot + 70)]), C(0xa8322a))
    // cup (top-down, nearly finished)
    let cc = P(612, 560)
    ctx.saveGState(); ctx.translateBy(x: cc.x, y: cc.y); ctx.scaleBy(x: 0.9, y: 0.9); ctx.translateBy(x: -cc.x, y: -cc.y)
    defer { ctx.restoreGState() }
    rgrad(ctx, P(cc.x + 16, cc.y + 22), 150, [(0, C(0x0f0703, 0.5)), (1, C(0x0f0703, 0))])
    rgrad(ctx, P(cc.x - 30, cc.y - 30), 150, [(0, C(0xffffff)), (0.7, C(0xefe4d6)), (1, C(0xcdbca5))], clip: circle(cc, 108))
    rgrad(ctx, cc, 92, [(0, C(0x6a3a1c)), (0.7, C(0x4a2610)), (1, C(0x2a1408))], clip: circle(cc, 90))
    stroke(ctx, circle(cc, 86), C(0xb7814e, 0.4), 4)
    fill(ctx, rrect(CGRect(x: cc.x - 22, y: cc.y + 96, width: 44, height: 70), 22), C(0xe9dfd0))
    // reading glasses
    stroke(ctx, circle(P(520, 1010), 46), C(0x1d1410, 0.9), 6)
    stroke(ctx, circle(P(630, 1000), 46), C(0x1d1410, 0.9), 6)
    let br = CGMutablePath(); br.move(to: P(564, 1000)); br.addQuadCurve(to: P(586, 998), control: P(575, 988)); stroke(ctx, br, C(0x1d1410, 0.9), 5)
    fill(ctx, circle(P(520, 1010), 42), C(0xffffff, 0.06)); fill(ctx, circle(P(630, 1000), 42), C(0xffffff, 0.06))
    // dried flower sprig
    let stem = CGMutablePath(); stem.move(to: P(90, 1100)); stem.addCurve(to: P(250, 980), control1: P(150, 1080), control2: P(200, 1020)); stroke(ctx, stem, C(0x7a6a3a), 3)
    for k in 0..<6 { fill(ctx, circle(P(110 + CGFloat(k) * 26, 1088 - CGFloat(k) * 20), 9), C(k % 2 == 0 ? 0xd8a7a0 : 0xe8c9a0, 0.9)) }
    steam(ctx, x: cc.x, y0: cc.y - 20, y1: 260, t: t, phase: 1.1, amp: 18, alpha: 0.35 * CGFloat(1 - p))
    ctx.restoreGState()
}

// MARK: - second brief stills (evening bookstore), warm or cool look

func bookstore(_ ctx: CGContext, _ idx: Int, cool: Bool) {
    let lamp: UInt32 = cool ? 0x8fb6ff : 0xffc27a
    let neon: UInt32 = cool ? 0xff5fd2 : 0xffd27a
    var rng = RNG(s: UInt64(100 + idx))
    func spines(_ r: CGRect) {
        var x = r.minX
        while x < r.maxX - 10 {
            let w = rng.r(16, 38), h = r.height * rng.r(0.72, 0.98)
            let warmCols: [UInt32] = [0x8a3b2e, 0x2f4a5a, 0xc29a4a, 0x4e6a46, 0xe2d2b4, 0x6a3c5a, 0xb5653a]
            let coolCols: [UInt32] = [0x2c3e72, 0x4b2c6a, 0x1f5a6a, 0x7a3a7a, 0xa9b8d8, 0x2a2f4a, 0x3a6aa0]
            let col = (cool ? coolCols : warmCols)[Int(rng.next() * 7) % 7]
            fill(ctx, rrect(CGRect(x: x, y: r.maxY - h, width: w - 2, height: h), 2), C(col))
            fill(ctx, CGPath(rect: CGRect(x: x + 3, y: r.maxY - h + 14, width: w - 8, height: 3), transform: nil), C(0xffffff, 0.25))
            x += w
        }
    }
    switch idx {
    case 0: // storefront at dusk
        vgrad(ctx, CGRect(x: 0, y: 0, width: FW, height: FH), cool ? [(0, C(0x0b1230)), (0.6, C(0x1c2450)), (1, C(0x0a0c18))] : [(0, C(0x5a3550)), (0.45, C(0xe08a5a)), (1, C(0x3a2218))])
        fill(ctx, CGPath(rect: CGRect(x: 60, y: 300, width: 600, height: 760), transform: nil), C(cool ? 0x1a1d2e : 0x4a2e22))
        let shop = CGRect(x: 110, y: 520, width: 500, height: 440)
        fill(ctx, CGPath(rect: shop, transform: nil), C(lamp, 0.9))
        ctx.saveGState(); ctx.clip(to: shop)
        for row in 0..<3 { spines(CGRect(x: 120, y: 560 + CGFloat(row) * 130, width: 480, height: 110)) }
        glow(ctx, P(360, 600), 360, lamp, 0.5)
        ctx.restoreGState()
        stroke(ctx, CGPath(rect: shop, transform: nil), C(0x111111, 0.9), 14)
        fill(ctx, rrect(CGRect(x: 200, y: 380, width: 320, height: 90), 10), C(0x111111, 0.85))
        stroke(ctx, rrect(CGRect(x: 214, y: 394, width: 292, height: 62), 8), C(neon, 0.95), 4)
        glow(ctx, P(360, 425), 220, neon, 0.35)
        vgrad(ctx, CGRect(x: 0, y: 1060, width: FW, height: 220), [(0, C(cool ? 0x141826 : 0x3a2a22)), (1, C(0x050505))])
        glow(ctx, P(360, 1100), 300, lamp, 0.25)
    case 1: // shelf aisle with pendant lamp
        vgrad(ctx, CGRect(x: 0, y: 0, width: FW, height: FH), [(0, C(cool ? 0x10142a : 0x2a1a10)), (1, C(cool ? 0x05060c : 0x120a06))])
        for row in 0..<6 {
            let y = 260 + CGFloat(row) * 160
            fill(ctx, CGPath(rect: CGRect(x: 30, y: y + 130, width: 660, height: 16), transform: nil), C(cool ? 0x2a2e44 : 0x6a4428))
            spines(CGRect(x: 40, y: y, width: 640, height: 130))
        }
        let cord = CGMutablePath(); cord.move(to: P(360, 0)); cord.addLine(to: P(360, 150)); stroke(ctx, cord, C(0x000000), 3)
        fill(ctx, poly([P(300, 200), P(420, 200), P(390, 150), P(330, 150)]), C(0x1a1a1a))
        glow(ctx, P(360, 230), 520, lamp, 0.45)
    case 2: // a book pulled from the shelf
        vgrad(ctx, CGRect(x: 0, y: 0, width: FW, height: FH), [(0, C(cool ? 0x141a34 : 0x3a2414)), (1, C(cool ? 0x070812 : 0x160c06))])
        for row in 0..<3 { spines(CGRect(x: 0, y: 160 + CGFloat(row) * 360, width: FW, height: 320)) }
        ctx.saveGState(); ctx.translateBy(x: 360, y: 640); ctx.rotate(by: -0.12)
        fill(ctx, rrect(CGRect(x: -110, y: -200, width: 240, height: 420), 6), C(0x000000, 0.5))
        fill(ctx, rrect(CGRect(x: -120, y: -210, width: 240, height: 420), 6), C(cool ? 0x3a4a8a : 0xb5653a))
        stroke(ctx, rrect(CGRect(x: -90, y: -160, width: 180, height: 120), 4), C(0xffffff, 0.6), 3)
        ctx.restoreGState()
        glow(ctx, P(420, 520), 380, lamp, 0.4)
    default: // reading corner
        vgrad(ctx, CGRect(x: 0, y: 0, width: FW, height: FH), [(0, C(cool ? 0x0e1226 : 0x2a1a12)), (1, C(cool ? 0x05060c : 0x120a06))])
        let win = CGRect(x: 380, y: 200, width: 280, height: 420)
        fill(ctx, CGPath(rect: win, transform: nil), C(cool ? 0x1a2a5a : 0x4a3a5a))
        for _ in 0..<14 { fill(ctx, circle(P(rng.r(390, 650), rng.r(210, 610)), rng.r(2, 6)), C(cool ? 0xbfd6ff : 0xffe2a8, 0.8)) }
        stroke(ctx, CGPath(rect: win, transform: nil), C(0x0a0a0a), 12)
        fill(ctx, rrect(CGRect(x: 80, y: 760, width: 360, height: 300), 60), C(cool ? 0x2a3050 : 0x7a3a2a))
        fill(ctx, rrect(CGRect(x: 60, y: 700, width: 90, height: 360), 40), C(cool ? 0x22284a : 0x6a3022))
        fill(ctx, rrect(CGRect(x: 370, y: 700, width: 90, height: 360), 40), C(cool ? 0x22284a : 0x6a3022))
        fill(ctx, CGPath(rect: CGRect(x: 560, y: 380, width: 8, height: 700), transform: nil), C(0x111111))
        fill(ctx, poly([P(510, 380), P(620, 380), P(590, 300), P(540, 300)]), C(cool ? 0x2a2a3a : 0x3a2a1a))
        glow(ctx, P(565, 420), 460, lamp, 0.5)
        fill(ctx, rrect(CGRect(x: 160, y: 820, width: 160, height: 26), 4), C(0xf2e8d8))
    }
    // grade
    fill(ctx, CGPath(rect: CGRect(x: 0, y: 0, width: FW, height: FH), transform: nil), cool ? C(0x2a3a8a, 0.12) : C(0xff9a4a, 0.08))
}

// MARK: - grading, captions, frame composition

func postGrade(_ ctx: CGContext, frame: Int, cool: Bool = false) {
    ctx.saveGState(); ctx.setBlendMode(.softLight)
    fill(ctx, CGPath(rect: CGRect(x: 0, y: 0, width: FW, height: FH), transform: nil), cool ? C(0x3a5ac8, 0.35) : C(0xffa24a, 0.30))
    ctx.restoreGState()
    rgrad(ctx, P(FW / 2, FH * 0.46), FH * 0.78, [(0, C(0, 0)), (0.55, C(0, 0)), (1, C(0x0a0503, 0.62))])
    ctx.saveGState(); ctx.setBlendMode(.overlay)
    drawImage(ctx, grain[frame % grain.count], CGRect(x: 0, y: 0, width: FW, height: FH), alpha: 0.10)
    ctx.restoreGState()
}

struct Cue: Codable { let start: Double; let end: Double; let text: String; let scene: Int }

let captionFont = CTFontCreateWithName("PingFangTC-Semibold" as CFString, 46, nil)
func drawCaption(_ ctx: CGContext, _ text: String, alpha: CGFloat) {
    let attrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): captionFont, NSAttributedString.Key(kCTForegroundColorAttributeName as String): C(0xffffff, alpha)]
    let line = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: attrs))
    let b = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
    let x = (FW - b.width) / 2 - b.minX, base: CGFloat = 1032
    ctx.saveGState()
    ctx.textMatrix = CGAffineTransform(scaleX: 1, y: -1)
    let outlineAttrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): captionFont,
        NSAttributedString.Key(kCTStrokeColorAttributeName as String): C(0x1a0f08, 0.55 * alpha), NSAttributedString.Key(kCTStrokeWidthAttributeName as String): 14.0]
    let outline = CTLineCreateWithAttributedString(NSAttributedString(string: text, attributes: outlineAttrs))
    ctx.setShadow(offset: CGSize(width: 0, height: -2), blur: 14, color: C(0x000000, 0.6 * alpha))
    ctx.textPosition = P(x, base); CTLineDraw(outline, ctx)
    ctx.setShadow(offset: .zero, blur: 0, color: nil)
    ctx.textPosition = P(x, base); CTLineDraw(line, ctx)
    ctx.restoreGState()
}

typealias SceneFn = (CGContext, Double, Double) -> Void
struct SceneDef { let start: Double; let end: Double; let fn: SceneFn }

func scenes(alt: Bool) -> [SceneDef] {
    [SceneDef(start: 0, end: 4, fn: sceneCoffeeCloseUp),
     SceneDef(start: 4, end: 9, fn: alt ? sceneFrenchPress : scenePourOver),
     SceneDef(start: 9, end: 15, fn: sceneWindowJournal),
     SceneDef(start: 15, end: 20, fn: sceneBookClosing)]
}

let overlay = makeContext()
func renderFrame(_ ctx: CGContext, time T: Double, frame: Int, defs: [SceneDef], cues: [Cue]?) {
    let i = defs.lastIndex { T >= $0.start } ?? 0
    let s = defs[i]
    let local = T - s.start
    if i > 0 && local < XFADE {
        let prev = defs[i - 1]
        prev.fn(ctx, prev.end - prev.start + local, prev.end - prev.start)
        overlay.clear(CGRect(x: 0, y: 0, width: FW, height: FH))
        s.fn(overlay, local, s.end - s.start)
        drawImage(ctx, overlay.makeImage()!, CGRect(x: 0, y: 0, width: FW, height: FH), alpha: CGFloat(ease(local / XFADE)))
    } else {
        s.fn(ctx, local, s.end - s.start)
    }
    postGrade(ctx, frame: frame)
    // fade in from black at the start, fade to black at the end
    let edge = min(T / 0.35, (TOTAL - T) / 0.8)
    if edge < 1 { fill(ctx, CGPath(rect: CGRect(x: 0, y: 0, width: FW, height: FH), transform: nil), C(0x0a0503, CGFloat(1 - max(0, edge)))) }
    if let cues {
        for c in cues where T >= c.start && T < c.end {
            let a = min(1, (T - c.start) / 0.12, (c.end - T) / 0.12)
            drawCaption(ctx, c.text, alpha: CGFloat(max(0, a)))
        }
    }
}

func writeVideo(_ url: URL, defs: [SceneDef], cues: [Cue]?) throws {
    try? FileManager.default.removeItem(at: url)
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
        AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 4_000_000, AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel]])
    input.expectsMediaDataInRealTime = false
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
    writer.add(input)
    writer.startWriting(); writer.startSession(atSourceTime: .zero)
    let frames = Int(TOTAL * Double(FPS))
    for f in 0..<frames {
        while !input.isReadyForMoreMediaData { usleep(2000) }
        var pb: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
        guard let buf = pb else { fatalError("pixel buffer") }
        CVPixelBufferLockBaseAddress(buf, [])
        let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: W, height: H, bitsPerComponent: 8,
                            bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: space,
                            bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
        ctx.translateBy(x: 0, y: FH); ctx.scaleBy(x: 1, y: -1)
        renderFrame(ctx, time: Double(f) / Double(FPS), frame: f, defs: defs, cues: cues)
        CVPixelBufferUnlockBaseAddress(buf, [])
        adaptor.append(buf, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: FPS))
    }
    input.markAsFinished()
    let sem = DispatchSemaphore(value: 0)
    writer.finishWriting { sem.signal() }
    sem.wait()
    if writer.status != .completed { throw writer.error ?? NSError(domain: "writer", code: 1) }
    print("video", url.lastPathComponent)
}

func saveJPEG(_ img: CGImage, _ url: URL, scale: CGFloat = 0.5) {
    let w = Int(CGFloat(img.width) * scale), h = Int(CGFloat(img.height) * scale)
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: space,
                        bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
    ctx.interpolationQuality = .high
    ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, ctx.makeImage()!, [kCGImageDestinationLossyCompressionQuality: 0.86] as CFDictionary)
    CGImageDestinationFinalize(dest)
}

func still(_ fn: SceneFn, t: Double, d: Double, cool: Bool = false) -> CGImage {
    let ctx = makeContext()
    fn(ctx, t, d)
    postGrade(ctx, frame: 0, cool: cool)
    return ctx.makeImage()!
}

// MARK: - audio composition

func duration(_ url: URL) async throws -> CMTime { try await AVURLAsset(url: url).load(.duration) }

func exportComposition(_ comp: AVMutableComposition, mix: AVAudioMix?, to url: URL, preset: String, type: AVFileType) async throws {
    try? FileManager.default.removeItem(at: url)
    guard let ex = AVAssetExportSession(asset: comp, presetName: preset) else { throw NSError(domain: "export", code: 2) }
    ex.audioMix = mix
    try await ex.export(to: url, as: type)
    print("export", url.lastPathComponent)
}

// MARK: - main

let args = CommandLine.arguments
let build = URL(fileURLWithPath: args[1]), out = URL(fileURLWithPath: args[2])
try FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
let mode = args.count > 3 ? args[3] : "all"
if mode == "yakiniku" { try renderYakiniku(out); print("yakiniku done"); exit(0) }

let voStarts: [Double] = [0.45, 4.45, 9.5, 15.35]
let sceneLines: [[String]] = [["週末想慢一點？"], ["讓咖啡香提醒你，", "今天不用急。"], ["找個靠窗的位置，", "和自己待一會兒。"], ["這個週末，", "記得留一點時間給自己。"]]
var cues: [Cue] = []
var voDur: [Double] = []
for i in 0..<4 {
    let d = try await duration(build.appendingPathComponent("vo\(i + 1).aiff")).seconds
    voDur.append(d)
    let parts = sceneLines[i]
    let total = Double(parts.reduce(0) { $0 + $1.count })
    var s = voStarts[i] - 0.1
    for (k, part) in parts.enumerated() {
        let share = d * Double(part.count) / total
        let sceneEnd = [4.0, 9.0, 15.0, 20.0][i]
        let e = k == parts.count - 1 ? min(sceneEnd - 0.15, voStarts[i] + d + 0.55) : s + share + 0.08
        cues.append(Cue(start: (s * 100).rounded() / 100, end: (e * 100).rounded() / 100, text: part.replacingOccurrences(of: "，", with: "").replacingOccurrences(of: "。", with: ""), scene: i + 1))
        s = e
    }
}
let enc = JSONEncoder(); enc.outputFormatting = [.prettyPrinted, .withoutEscapingSlashes]
try enc.encode(["cues": cues]).write(to: out.appendingPathComponent("captions.json"))
print("vo durations", voDur)

if mode == "all" || mode == "stills" {
    let thumbs: [(String, SceneFn, Double, Double)] = [("scene1", sceneCoffeeCloseUp, 2.2, 4), ("scene2", scenePourOver, 3.0, 5), ("scene2-alt", sceneFrenchPress, 3.0, 5), ("scene3", sceneWindowJournal, 4.0, 6), ("scene4", sceneBookClosing, 1.6, 5)]
    for (n, f, t, d) in thumbs { saveJPEG(still(f, t: t, d: d), out.appendingPathComponent("\(n).jpg")) }
    for i in 0..<4 { for cool in [false, true] {
        let ctx = makeContext(); bookstore(ctx, i, cool: cool); postGrade(ctx, frame: 0, cool: cool)
        saveJPEG(ctx.makeImage()!, out.appendingPathComponent("bookstore\(i + 1)-\(cool ? "cool" : "warm").jpg"))
    } }
    print("stills done")
}

if mode == "all" || mode == "video" {
    // silent preview visuals (captions are rendered live by the app so edits show instantly)
    try writeVideo(build.appendingPathComponent("v_original.mp4"), defs: scenes(alt: false), cues: nil)
    try writeVideo(build.appendingPathComponent("v_alt.mp4"), defs: scenes(alt: true), cues: nil)
    // caption-burned visuals for exportable files
    try writeVideo(build.appendingPathComponent("vc_original.mp4"), defs: scenes(alt: false), cues: cues)
    try writeVideo(build.appendingPathComponent("vc_alt.mp4"), defs: scenes(alt: true), cues: cues)
}

if mode == "all" || mode == "video" || mode == "mix" {
    let total = CMTime(seconds: TOTAL, preferredTimescale: 600)
    func voTrack(_ comp: AVMutableComposition) async throws {
        let tr = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
        for i in 0..<4 {
            let a = AVURLAsset(url: build.appendingPathComponent("vo\(i + 1).aiff"))
            let src = try await a.loadTracks(withMediaType: .audio)[0]
            let d = try await a.load(.duration)
            try tr.insertTimeRange(CMTimeRange(start: .zero, duration: d), of: src, at: CMTime(seconds: voStarts[i], preferredTimescale: 600))
        }
    }
    // narration stem for live preview
    let voComp = AVMutableComposition()
    try await voTrack(voComp)
    try await exportComposition(voComp, mix: nil, to: out.appendingPathComponent("voiceover.m4a"), preset: AVAssetExportPresetAppleM4A, type: .m4a)
    // music stems for live preview
    for m in ["lofi", "acoustic"] {
        let c = AVMutableComposition()
        let tr = c.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
        let a = AVURLAsset(url: build.appendingPathComponent("music_\(m).wav"))
        try tr.insertTimeRange(CMTimeRange(start: .zero, duration: total), of: try await a.loadTracks(withMediaType: .audio)[0], at: .zero)
        try await exportComposition(c, mix: nil, to: out.appendingPathComponent("music-\(m).m4a"), preset: AVAssetExportPresetAppleM4A, type: .m4a)
    }
    // copy silent previews
    for v in ["original", "alt"] {
        let dst = out.appendingPathComponent("preview-\(v).mp4")
        try? FileManager.default.removeItem(at: dst)
        try FileManager.default.copyItem(at: build.appendingPathComponent("v_\(v).mp4"), to: dst)
    }
    // full mixed, caption-burned exports: scene02 (original|alt) x music (lofi|acoustic)
    for v in ["original", "alt"] { for m in ["lofi", "acoustic"] {
        let comp = AVMutableComposition()
        let va = AVURLAsset(url: build.appendingPathComponent("vc_\(v).mp4"))
        let vt = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
        try vt.insertTimeRange(CMTimeRange(start: .zero, duration: total), of: try await va.loadTracks(withMediaType: .video)[0], at: .zero)
        try await voTrack(comp)
        let mt = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
        let ma = AVURLAsset(url: build.appendingPathComponent("music_\(m).wav"))
        try mt.insertTimeRange(CMTimeRange(start: .zero, duration: total), of: try await ma.loadTracks(withMediaType: .audio)[0], at: .zero)
        let p = AVMutableAudioMixInputParameters(track: mt)
        p.setVolume(0.30, at: .zero)
        p.setVolumeRamp(fromStartVolume: 0.30, toEndVolume: 0.0, timeRange: CMTimeRange(start: CMTime(seconds: 18.4, preferredTimescale: 600), duration: CMTime(seconds: 1.6, preferredTimescale: 600)))
        let mix = AVMutableAudioMix(); mix.inputParameters = [p]
        try await exportComposition(comp, mix: mix, to: out.appendingPathComponent("reel-\(v)-\(m).mp4"), preset: AVAssetExportPresetHighestQuality, type: .mp4)
    } }
}
print("done")
