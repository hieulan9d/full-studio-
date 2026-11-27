// Template ExtendScript (.jsx) chuẩn cho Adobe Photoshop 2026
// Tạo cấu trúc Layer chuyên nghiệp: Original -> Spot Heal -> Frequency Separation (Low + High) -> Curves Chỉnh Tươi
#target photoshop
app.displayDialogs = DialogModes.NO;

function setupRetouchLayers(doc) {
    var orig = doc.activeLayer;
    orig.name = "00_Anh_Goc";

    var healLayer = orig.duplicate();
    healLayer.name = "01_Xoa_Mun_Khuyet_Diem";
    doc.activeLayer = healLayer;

    // Tạo Group Frequency Separation nhẹ tự nhiên (Opacity 30% để giữ lỗ chân lông thật)
    var fsGroup = doc.layerSets.add();
    fsGroup.name = "02_Frequency_Separation_Nhe";
    fsGroup.opacity = 32;

    var lowLayer = healLayer.duplicate(fsGroup, ElementPlacement.INSIDE);
    lowLayer.name = "FS_Low_Tone";
    var highLayer = healLayer.duplicate(fsGroup, ElementPlacement.PLACEBEFORE);
    highLayer.move(lowLayer, ElementPlacement.PLACEBEFORE);
    highLayer.name = "FS_High_Texture_Pores";

    doc.activeLayer = lowLayer;
    lowLayer.applyGaussianBlur(6.0);

    // Apply Image Subtract cho High Frequency (8-bit: Scale=2, Offset=128 -> Linear Light)
    doc.activeLayer = highLayer;
    var desc = new ActionDescriptor();
    var withDesc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putName(charIDToTypeID("Lyr "), "FS_Low_Tone");
    withDesc.putReference(charIDToTypeID("T   "), ref);
    withDesc.putEnumerated(charIDToTypeID("Clcl"), charIDToTypeID("Clcn"), charIDToTypeID("Sbtr"));
    withDesc.putDouble(charIDToTypeID("Scl "), 2.0);
    withDesc.putInteger(charIDToTypeID("Ofst"), 128);
    desc.putObject(charIDToTypeID("With"), charIDToTypeID("Clcl"), withDesc);
    executeAction(charIDToTypeID("AppI"), desc, DialogModes.NO);
    highLayer.blendMode = BlendMode.LINEARLIGHT;
}

if (app.documents.length > 0) {
    app.activeDocument.suspendHistory("Studio Retouch Layer Setup", "setupRetouchLayers(app.activeDocument)");
}
