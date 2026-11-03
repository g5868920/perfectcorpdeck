import AVFoundation
import CoreGraphics
import CoreText
import Foundation
// Sample "creator footage" for the media-first demo: original procedural illustrations of a
// yakiniku night out (no real restaurants, people or logos). Rendered as stills + two short clips.

func meatSlice(_ ctx: CGContext, _ c: CGPoint, _ ang: CGFloat, _ s: CGFloat, seared: CGFloat) {
    ctx.saveGState(); ctx.translateBy(x: c.x, y: c.y); ctx.rotate(by: ang); ctx.scaleBy(x: s, y: s)
    fill(ctx, rrect(CGRect(x: -58, y: -30, width: 124, height: 66), 26), C(0x1a0805, 0.35))
    let body = rrect(CGRect(x: -62, y: -34, width: 124, height: 66), 26)
    lgradPath(ctx, body, P(-60, 0), P(60, 0), [(0, C(0xc2463f)), (0.5, C(0xd9645a)), (1, C(0xa8352f))])
    var r = RNG(s: UInt64(abs(Int(c.x * 7 + c.y))))
    for _ in 0..<7 {
        let p = CGMutablePath(); let y = r.r(-26, 26); p.move(to: P(-54, y))
        p.addCurve(to: P(54, y + r.r(-10, 10)), control1: P(-20, y + r.r(-14, 14)), control2: P(20, y + r.r(-14, 14)))
        stroke(ctx, p, C(0xf6e2d6, 0.75), r.r(1.5, 4))
    }
    if seared > 0 {
        fill(ctx, body, C(0x5a2412, 0.55 * seared))
        for i in 0..<4 { let x = CGFloat(-42 + i * 28); stroke(ctx, CGPath(rect: CGRect(x: x, y: -30, width: 0.1, height: 60), transform: nil), C(0x2a0c04, 0.7 * seared), 5) }
    }
    ctx.restoreGState()
}

func smoke(_ ctx: CGContext, _ x: CGFloat, _ y0: CGFloat, _ t: Double, _ ph: Double) {
    steam(ctx, x: x, y0: y0, y1: y0 - 420, t: t, phase: ph, amp: 40, alpha: 0.9)
}

func yakiGrill(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / max(d, 0.01)
    ctx.saveGState(); camera(ctx, zoom: 1.04 + 0.06 * CGFloat(ease(p)), rot: CGFloat(-1 + 2 * p))
    vgrad(ctx, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200), [(0, C(0x241610)), (1, C(0x0f0805))])
    let c = P(360, 640)
    fill(ctx, circle(c, 330), C(0x3a3a3e)); stroke(ctx, circle(c, 330), C(0x6a6a70), 14)
    rgrad(ctx, c, 300, [(0, C(0xffb14a, 0.95)), (0.5, C(0xff6a1a, 0.7)), (1, C(0x5a1a05, 0.9))], clip: circle(c, 312))
    var r = RNG(s: 4)
    for _ in 0..<26 { let a = r.r(0, 6.28), rr = r.r(0, 260); glow(ctx, P(c.x + cos(a) * rr, c.y + sin(a) * rr), r.r(18, 46), 0xffd28a, CGFloat(0.35 + 0.3 * sin(t * 6 + Double(a) * 3))) }
    for i in -6...6 { let x = c.x + CGFloat(i) * 46; ctx.saveGState(); ctx.addPath(circle(c, 312)); ctx.clip(); stroke(ctx, CGPath(rect: CGRect(x: x, y: 300, width: 0.1, height: 700), transform: nil), C(0x1c1c1f), 9); ctx.restoreGState() }
    let sear = CGFloat(min(1, 0.3 + p))
    meatSlice(ctx, P(250, 520), 0.3, 1.0, seared: sear)
    meatSlice(ctx, P(460, 560), -0.4, 1.05, seared: sear * 0.8)
    meatSlice(ctx, P(330, 760), 0.1, 1.1, seared: sear * 0.5)
    meatSlice(ctx, P(510, 780), 0.8, 0.95, seared: 0.1)
    // tongs
    ctx.saveGState(); ctx.translateBy(x: 560 - CGFloat(p * 40), y: 330); ctx.rotate(by: 0.6)
    fill(ctx, rrect(CGRect(x: -12, y: -260, width: 22, height: 300), 8), C(0xc9c9cc)); fill(ctx, rrect(CGRect(x: 18, y: -260, width: 22, height: 300), 8), C(0xa9a9ad))
    ctx.restoreGState()
    smoke(ctx, 300, 560, t, 0.3); smoke(ctx, 450, 600, t, 2.4)
    ctx.restoreGState()
}

func yakiPlatter(_ ctx: CGContext, _ t: Double, _ d: Double) {
    ctx.saveGState(); camera(ctx, zoom: 1.06, rot: -2)
    drawImage(ctx, woodEvening, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200))
    rgrad(ctx, P(380, 660), 380, [(0, C(0x0a0402, 0.5)), (1, C(0x0a0402, 0))])
    let plate = rrect(CGRect(x: 90, y: 330, width: 540, height: 640), 60)
    lgradPath(ctx, plate, P(90, 0), P(630, 0), [(0, C(0x1d1d22)), (1, C(0x2c2c33))])
    stroke(ctx, plate, C(0x55555e), 4)
    for i in 0..<6 { meatSlice(ctx, P(250 + CGFloat(i % 2) * 210, 440 + CGFloat(i / 2) * 170), CGFloat(i % 2 == 0 ? 0.15 : -0.2), 1.15, seared: 0) }
    for k in 0..<5 { ctx.saveGState(); ctx.translateBy(x: 150 + CGFloat(k) * 14, y: 900); ctx.rotate(by: CGFloat(-0.6 + Double(k) * 0.3)); fill(ctx, ellipse(P(0, -26), 14, 34), C(0x4f8a3a)); ctx.restoreGState() }
    fill(ctx, circle(P(560, 920), 46), C(0xe9e2d4)); fill(ctx, circle(P(560, 920), 36), C(0x3a1a0a))
    ctx.restoreGState()
}

func yakiInterior(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / max(d, 0.01)
    ctx.saveGState(); camera(ctx, zoom: 1.05, dx: CGFloat(-15 + 30 * p))
    vgrad(ctx, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200), [(0, C(0x2a160c)), (0.6, C(0x4a2a16)), (1, C(0x1a0d06))])
    for i in 0..<9 { fill(ctx, CGPath(rect: CGRect(x: CGFloat(i) * 90 - 40, y: 0, width: 8, height: 760), transform: nil), C(0x1a0c05, 0.6)) }
    for (x, y, col) in [(140.0, 260.0, 0xe8463a), (360.0, 230.0, 0xf4efe4), (580.0, 270.0, 0xe8463a)] as [(Double, Double, UInt32)] {
        let sway = CGFloat(sin(t * 1.4 + x)) * 6
        stroke(ctx, CGPath(rect: CGRect(x: x, y: 0, width: 0.1, height: y - 90), transform: nil), C(0x111111), 3)
        glow(ctx, P(CGFloat(x) + sway, CGFloat(y)), 220, 0xffb36b, 0.35)
        let l = ellipse(P(CGFloat(x) + sway, CGFloat(y)), 70, 95)
        rgrad(ctx, P(CGFloat(x) + sway - 20, CGFloat(y) - 25), 120, [(0, C(0xffffff, 0.9)), (0.5, C(col)), (1, C(col, 0.85))], clip: l)
        for k in -2...2 { stroke(ctx, CGPath(rect: CGRect(x: CGFloat(x) + sway - 68, y: CGFloat(y) + CGFloat(k) * 30, width: 136, height: 0.1), transform: nil), C(0x000000, 0.15), 2) }
        let attrs: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): CTFontCreateWithName("PingFangTC-Semibold" as CFString, 38, nil), NSAttributedString.Key(kCTForegroundColorAttributeName as String): C(col == 0xe8463a ? 0xffffff : 0x2a1208, 0.9)]
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: "燒肉", attributes: attrs))
        ctx.saveGState(); ctx.textMatrix = CGAffineTransform(scaleX: 1, y: -1); ctx.textPosition = P(CGFloat(x) + sway - 38, CGFloat(y) + 14); CTLineDraw(line, ctx); ctx.restoreGState()
    }
    // counter + grills + stools
    vgrad(ctx, CGRect(x: -100, y: 760, width: FW + 200, height: 520), [(0, C(0x8a5530)), (0.06, C(0x6a3c1f)), (1, C(0x2a160a))])
    for i in 0..<3 { let x = 130 + CGFloat(i) * 230; fill(ctx, ellipse(P(x, 820), 80, 22), C(0x2c2c30)); glow(ctx, P(x, 816), 70, 0xff7a2a, CGFloat(0.4 + 0.2 * sin(t * 5 + Double(i)))); smoke(ctx, x, 800, t, Double(i)) }
    for i in 0..<4 { fill(ctx, rrect(CGRect(x: 60 + CGFloat(i) * 170, y: 1050, width: 110, height: 40), 20), C(0x1a0d06)) }
    ctx.restoreGState()
}

func yakiStreet(_ ctx: CGContext, _ t: Double, _ d: Double) {
    let p = t / max(d, 0.01)
    ctx.saveGState(); camera(ctx, zoom: 1.08 - 0.05 * CGFloat(p), dy: CGFloat(10 - 20 * p))
    vgrad(ctx, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200), [(0, C(0x0a0c1e)), (0.55, C(0x1a1430)), (1, C(0x0c0a12))])
    fill(ctx, poly([P(-100, 0), P(250, 0), P(300, 820), P(-100, 1100)]), C(0x1c1822))
    fill(ctx, poly([P(470, 0), P(820, 0), P(820, 1100), P(420, 820)]), C(0x221a24))
    var r = RNG(s: 9)
    for i in 0..<7 {
        let left = i % 2 == 0, y = 120 + CGFloat(i) * 105
        let x = left ? 40 + CGFloat(i) * 22 : 600 - CGFloat(i) * 22
        let col: UInt32 = [0xff5a4a, 0xffc24a, 0x4ad0ff, 0xff7ad9][i % 4]
        let w = r.r(70, 120), h = r.r(140, 220)
        let a = CGFloat(0.75 + 0.25 * sin(t * 3 + Double(i)))
        glow(ctx, P(x + w / 2, y + h / 2), 160, col, 0.3 * a)
        fill(ctx, rrect(CGRect(x: x, y: y, width: w, height: h), 8), C(col, 0.85 * a))
        stroke(ctx, rrect(CGRect(x: x + 8, y: y + 8, width: w - 16, height: h - 16), 4), C(0xffffff, 0.5), 2)
    }
    for (x, y) in [(300.0, 520.0), (420.0, 560.0)] { glow(ctx, P(CGFloat(x), CGFloat(y)), 120, 0xff6a3a, 0.5); fill(ctx, ellipse(P(CGFloat(x), CGFloat(y)), 32, 44), C(0xe8463a)) }
    // wet road reflections
    vgrad(ctx, CGRect(x: -100, y: 820, width: FW + 200, height: 500), [(0, C(0x1a1620)), (1, C(0x08070c))])
    for i in 0..<12 { let x = r.r(0, 720); stroke(ctx, CGPath(rect: CGRect(x: x, y: 840 + r.r(0, 380), width: r.r(20, 80), height: 0.1), transform: nil), C([0xff5a4a, 0xffc24a, 0x4ad0ff][i % 3], 0.35), 4) }
    // silhouettes walking
    for k in 0..<2 { let x = 300 + CGFloat(k) * 90 + CGFloat(p * 60); fill(ctx, rrect(CGRect(x: x, y: 700, width: 46, height: 160), 20), C(0x050408, 0.9)); fill(ctx, circle(P(x + 23, 680), 22), C(0x050408, 0.9)) }
    ctx.restoreGState()
}

func yakiTable(_ ctx: CGContext, _ t: Double, _ d: Double) {
    ctx.saveGState(); camera(ctx, zoom: 1.05, rot: 1.5)
    drawImage(ctx, woodWarm, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200))
    // beer mugs
    for (x, y) in [(170.0, 300.0), (540.0, 330.0)] {
        let r = rrect(CGRect(x: CGFloat(x) - 70, y: CGFloat(y) - 90, width: 140, height: 190), 26)
        lgradPath(ctx, r, P(CGFloat(x) - 70, 0), P(CGFloat(x) + 70, 0), [(0, C(0xd99a1c)), (0.5, C(0xf3c24a)), (1, C(0xc5860f))])
        fill(ctx, rrect(CGRect(x: CGFloat(x) - 72, y: CGFloat(y) - 112, width: 144, height: 44), 22), C(0xfdf7ea))
        stroke(ctx, r, C(0xffffff, 0.5), 4)
    }
    // rice bowls & small dishes
    for (x, y, col) in [(200.0, 700.0, 0xf7f3ea), (520.0, 720.0, 0xf7f3ea), (360.0, 560.0, 0xc8382a), (360.0, 900.0, 0x5c8a3a)] as [(Double, Double, UInt32)] {
        fill(ctx, circle(P(CGFloat(x) + 8, CGFloat(y) + 10), 98), C(0x1a0c05, 0.35))
        fill(ctx, circle(P(CGFloat(x), CGFloat(y)), 96), C(0x2a2a30)); fill(ctx, circle(P(CGFloat(x), CGFloat(y)), 80), C(col))
    }
    for k in 0..<2 { let p = CGMutablePath(); p.move(to: P(470 + CGFloat(k) * 18, 980)); p.addLine(to: P(640 + CGFloat(k) * 18, 620)); stroke(ctx, p, C(0x8a5a2a), 9) }
    ctx.restoreGState()
}

func yakiSizzle(_ ctx: CGContext, _ t: Double, _ d: Double) {
    ctx.saveGState(); camera(ctx, zoom: 1.3 + 0.05 * CGFloat(sin(t)), cx: 360, cy: 660)
    vgrad(ctx, CGRect(x: -100, y: -100, width: FW + 200, height: FH + 200), [(0, C(0x120806)), (1, C(0x060302))])
    rgrad(ctx, P(360, 760), 500, [(0, C(0xff8a2a, 0.8)), (1, C(0x1a0602, 0))])
    for i in -4...4 { stroke(ctx, CGPath(rect: CGRect(x: 360 + CGFloat(i) * 70, y: 400, width: 0.1, height: 700), transform: nil), C(0x18181b), 14) }
    meatSlice(ctx, P(360, 680), -0.1, 2.2, seared: 0.6)
    var r = RNG(s: 3)
    for _ in 0..<30 { let x = r.r(150, 570), base = r.r(500, 900); let y = base - CGFloat((t * 140 + Double(base)).truncatingRemainder(dividingBy: 260)); fill(ctx, circle(P(x, y), r.r(2, 4)), C(0xffc46a, 0.8)) }
    smoke(ctx, 300, 620, t, 0.1); smoke(ctx, 420, 640, t, 2.0)
    ctx.restoreGState()
}

func writeClip(_ url: URL, fn: SceneFn, dur: Double) throws {
    try? FileManager.default.removeItem(at: url)
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: W, AVVideoHeightKey: H,
        AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_500_000]])
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H])
    writer.add(input); writer.startWriting(); writer.startSession(atSourceTime: .zero)
    let frames = Int(dur * Double(FPS))
    for f in 0..<frames {
        while !input.isReadyForMoreMediaData { usleep(2000) }
        var pb: CVPixelBuffer?; CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb); let buf = pb!
        CVPixelBufferLockBaseAddress(buf, [])
        let ctx = CGContext(data: CVPixelBufferGetBaseAddress(buf), width: W, height: H, bitsPerComponent: 8, bytesPerRow: CVPixelBufferGetBytesPerRow(buf), space: space, bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
        ctx.translateBy(x: 0, y: FH); ctx.scaleBy(x: 1, y: -1)
        fn(ctx, Double(f) / Double(FPS), dur); postGrade(ctx, frame: f)
        CVPixelBufferUnlockBaseAddress(buf, [])
        adaptor.append(buf, withPresentationTime: CMTime(value: CMTimeValue(f), timescale: FPS))
    }
    input.markAsFinished(); let sem = DispatchSemaphore(value: 0); writer.finishWriting { sem.signal() }; sem.wait()
    print("clip", url.lastPathComponent)
}

func renderYakiniku(_ out: URL) throws {
    let dir = out.appendingPathComponent("yakiniku"); try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let stills: [(String, SceneFn, Double)] = [("grill", yakiGrill, 2), ("platter", yakiPlatter, 1), ("interior", yakiInterior, 1.5), ("street", yakiStreet, 1.5), ("table", yakiTable, 1), ("sizzle", yakiSizzle, 1.2)]
    for (n, f, t) in stills { saveJPEG(still(f, t: t, d: 4), dir.appendingPathComponent("\(n).jpg"), scale: 1.0) }
    try writeClip(dir.appendingPathComponent("grill-clip.mp4"), fn: yakiGrill, dur: 4)
    try writeClip(dir.appendingPathComponent("street-clip.mp4"), fn: yakiStreet, dur: 4)
}
