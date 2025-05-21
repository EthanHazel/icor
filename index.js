const { Buffer } = require("buffer");

function compileIco(images) {
  validateImages(images, ["width", "height", "data"]);

  const headerSize = 6;
  const directoryEntrySize = 16;
  const directoriesSize = images.length * directoryEntrySize;
  const totalImageSize = images.reduce((sum, img) => sum + img.data.length, 0);
  const totalSize = headerSize + directoriesSize + totalImageSize;

  const finalBuffer = Buffer.alloc(totalSize);

  finalBuffer.writeUInt16LE(0, 0); // Reserved
  finalBuffer.writeUInt16LE(1, 2); // Image type (ICO)
  finalBuffer.writeUInt16LE(images.length, 4); // Number of images

  let dataOffset = headerSize + directoriesSize;
  const dataOffsets = [];

  images.forEach((img, index) => {
    const offset = headerSize + index * directoryEntrySize;

    finalBuffer.writeUInt8(
      img.width === 256 || img.width === 512 ? 0 : img.width,
      offset
    );
    finalBuffer.writeUInt8(
      img.height === 256 || img.height === 512 ? 0 : img.height,
      offset + 1
    );
    finalBuffer.writeUInt8(0, offset + 2); // Color palette
    finalBuffer.writeUInt8(0, offset + 3); // Reserved
    finalBuffer.writeUInt16LE(1, offset + 4); // Color planes
    finalBuffer.writeUInt16LE(32, offset + 6); // Bits per pixel
    finalBuffer.writeUInt32LE(img.data.length, offset + 8); // Data size
    finalBuffer.writeUInt32LE(dataOffset, offset + 12); // Data offset

    dataOffsets.push(dataOffset);
    dataOffset += img.data.length;
  });

  images.forEach((img, index) => {
    img.data.copy(finalBuffer, dataOffsets[index]);
  });

  return finalBuffer;
}

function compileIcns(images) {
  validateImages(images, ["size", "data"]);

  const sizeToType = {
    16: "icp3",
    32: "icp4",
    64: "icp6",
    128: "ic07",
    256: "ic08",
    512: "ic09",
    1024: "ic10",
  };

  const validImages = images.filter(
    (img) => sizeToType[img.size] && img.data.length > 0
  );

  if (validImages.length === 0) {
    throw new Error("No valid ICNS images provided");
  }

  const chunks = validImages.map((img) => {
    const type = sizeToType[img.size];
    const header = Buffer.from(type, "ascii");
    const length = Buffer.alloc(4);
    length.writeUInt32BE(img.data.length + 8, 0);

    return Buffer.concat([header, length, img.data]);
  });

  const totalSize = 8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const header = Buffer.alloc(8);
  header.write("icns", 0);
  header.writeUInt32BE(totalSize, 4);

  return Buffer.concat([header, ...chunks]);
}

function validateImages(images, requiredProps) {
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("At least one image is required");
  }

  images.forEach((img, index) => {
    requiredProps.forEach((prop) => {
      if (!(prop in img)) {
        throw new Error(
          `Image at index ${index} missing required property: ${prop}`
        );
      }
    });

    if (!Buffer.isBuffer(img.data)) {
      throw new Error(`Image at index ${index} data must be a Buffer`);
    }
  });
}

module.exports = {
  compileIco,
  compileIcns,
};
