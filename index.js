// Super Mario Sunshine is an F tier mario game

const { Buffer } = require("buffer");

/**
 * Validates input images array and image properties
 * @param {Array} images - Array of image objects
 * @param {Array} requiredProps - Required properties for each image
 * @throws {Error} If validation fails
 *
 * This helper function:
 * 1. Checks if input is a non-empty array
 * 2. Verifies each image contains required properties
 * 3. Ensures image data is a Buffer
 * Used by both compileIco and compileIcns
 */
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

/**
 * Compiles ICO file from array of images
 * @param {Array} images - Array of image objects with width, height, data
 * @returns {Buffer} - Complete ICO file buffer
 *
 * Structure:
 * 1. 6-byte header (reserved, type, image count)
 * 2. Directory entries (16 bytes each)
 * 3. Image data
 *
 * Process:
 * 1. Validate input images
 * 2. Calculate buffer sizes
 * 3. Write header information
 * 4. Create directory entries with offsets
 * 5. Copy image data into final buffer
 */
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

    // width and height are stored in 1 byte each, except for 256/512
    // which are stored as 0
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

/**
 * Compiles ICNS file from array of images
 * @param {Array} images - Array of image objects with size, data
 * @returns {Buffer} - Complete ICNS file buffer
 *
 * Structure:
 * 1. 8-byte header ('icns' + total size)
 * 2. Series of chunks (type + size + data)
 *
 * Process:
 * 1. Validate input images
 * 2. Filter valid sizes (16-1024)
 * 3. Create chunks with type headers
 * 4. Combine all chunks into final buffer
 */
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

/**
 * Parses ICO file buffer into usable format
 * @param {Buffer} buffer - ICO file data
 * @returns {Object} - Contains images array and helper methods
 *
 * Return object includes:
 * - images: Array of parsed image objects
 * - getImage(width, height): Retrieves specific image data
 * - getInfo(): Returns metadata about all images
 *
 * Process:
 * 1. Validate header structure
 * 2. Read directory entries
 * 3. Extract image data from offsets
 * 4. Handle 256/512 size encoding (0 values)
 */
function parseIco(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer");
  }

  if (buffer.length < 6) {
    throw new Error("ICO file is too small to contain header");
  }

  const reserved = buffer.readUInt16LE(0);
  if (reserved !== 0) {
    throw new Error("Invalid ICO file: reserved field must be 0");
  }

  const imageType = buffer.readUInt16LE(2);
  if (imageType !== 1) {
    throw new Error("Invalid ICO file: image type must be 1 (ICO)");
  }

  const numImages = buffer.readUInt16LE(4);
  if (numImages === 0) {
    throw new Error("ICO file contains no images");
  }

  const headerSize = 6;
  const directoryEntrySize = 16;
  const directorySize = numImages * directoryEntrySize;

  if (buffer.length < headerSize + directorySize) {
    throw new Error("ICO directory entries exceed buffer length");
  }

  const directoryEntries = [];
  for (let i = 0; i < numImages; i++) {
    const entryOffset = headerSize + i * directoryEntrySize;

    const width = buffer.readUInt8(entryOffset) || 256;
    const height = buffer.readUInt8(entryOffset + 1) || 256;
    const colorPalette = buffer.readUInt8(entryOffset + 2);
    const reserved = buffer.readUInt8(entryOffset + 3);
    const colorPlanes = buffer.readUInt16LE(entryOffset + 4);
    const bpp = buffer.readUInt16LE(entryOffset + 6);
    const dataSize = buffer.readUInt32LE(entryOffset + 8);
    const dataOffset = buffer.readUInt32LE(entryOffset + 12);

    directoryEntries.push({
      width,
      height,
      colorPalette,
      reserved,
      colorPlanes,
      bpp,
      dataSize,
      dataOffset,
    });
  }

  const images = [];
  for (const entry of directoryEntries) {
    const endOffset = entry.dataOffset + entry.dataSize;
    if (endOffset > buffer.length) {
      throw new Error("ICO image data exceeds buffer length");
    }
    const data = buffer.subarray(entry.dataOffset, endOffset);
    images.push({
      width: entry.width,
      height: entry.height,
      bpp: entry.bpp,
      dataSize: entry.dataSize,
      data,
    });
  }

  return {
    images,
    getImage(width, height) {
      const image = images.find(
        (img) => img.width === width && img.height === height
      );
      return image ? image.data : null;
    },
    getInfo() {
      return images.map((img) => ({
        width: img.width,
        height: img.height,
        bpp: img.bpp,
        dataSize: img.data.length,
      }));
    },
  };
}

/**
 * Parses ICNS file buffer into usable format
 * @param {Buffer} buffer - ICNS file data
 * @returns {Object} - Contains images array and helper methods
 *
 * Return object includes:
 * - images: Array of parsed image chunks
 * - getImage(size): Retrieves specific image data
 * - getInfo(): Returns metadata about all chunks
 *
 * Process:
 * 1. Validate header and magic number
 * 2. Iterate through chunks
 * 3. Map chunk types to known sizes
 * 4. Store chunk data with metadata
 */
function parseIcns(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Input must be a Buffer");
  }

  if (buffer.length < 8) {
    throw new Error("ICNS file is too small to contain header");
  }

  const magic = buffer.toString("ascii", 0, 4);
  if (magic !== "icns") {
    throw new Error('Invalid ICNS file: header does not start with "icns"');
  }

  const totalSize = buffer.readUInt32BE(4);
  if (totalSize > buffer.length) {
    throw new Error("ICNS file size in header exceeds actual buffer length");
  }

  const typeToSize = {
    icp3: 16,
    icp4: 32,
    icp6: 64,
    ic07: 128,
    ic08: 256,
    ic09: 512,
    ic10: 1024,
  };

  let offset = 8;
  const images = [];

  while (offset < totalSize) {
    if (offset + 8 > buffer.length) {
      throw new Error("ICNS chunk header exceeds buffer length");
    }

    const type = buffer.toString("ascii", offset, offset + 4);
    const chunkLength = buffer.readUInt32BE(offset + 4);

    if (chunkLength < 8) {
      throw new Error(`Invalid ICNS chunk length for type ${type}`);
    }

    if (offset + chunkLength > buffer.length) {
      throw new Error("ICNS chunk data exceeds buffer length");
    }

    const dataStart = offset + 8;
    const dataEnd = offset + chunkLength;
    const data = buffer.subarray(dataStart, dataEnd);

    images.push({
      type,
      size: typeToSize[type] || null,
      data,
    });

    offset += chunkLength;
  }

  return {
    images,
    getImage(size) {
      const image = images.find((img) => img.size === size);
      return image ? image.data : null;
    },
    getInfo() {
      return images.map((img) => ({
        type: img.type,
        size: img.size,
        dataSize: img.data.length,
      }));
    },
  };
}

module.exports = {
  compileIco,
  compileIcns,
  parseIco,
  parseIcns,
};
