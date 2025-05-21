# 🔍 ICOR - Icon Reader

[![npm version](https://img.shields.io/npm/v/icor?color=blue&logo=npm)](https://www.npmjs.com/package/icor)
[![license](https://img.shields.io/npm/l/icor)](https://github.com/yourusername/icor/blob/main/LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/min/icor)](https://bundlephobia.com/package/icor)

### A lightweight parser and compiler for .ICO and .ICNS icon files

```bash
npm install icor
```

## Features

- **ICO Compilation/Parsing**

  - Create valid ICO files from image buffers
  - Parse existing ICO files into usable image data
  - Handle special sizes (256px/512px encoding)

- **ICNS Compilation/Parsing**

  - Generate Apple ICNS files from source images
  - Extract images from existing ICNS containers
  - Support for standard Apple icon sizes

- **Validation**
  - Strict input validation with helpful errors
  - Buffer type checking
  - Required property verification

## Examples

### ICO

#### Compiling

```JavaScript
const { compileIco } = require('icor');
const fs = require('fs');

const images = [
  {
    width: 32,
    height: 32,
    data: Buffer.from('PNG_DATA_HERE')
  },
  {
    width: 64,
    height: 64,
    data: Buffer.from('PNG_DATA_HERE')
  }
];

const icoBuffer = compileIco(images);
fs.writeFileSync('output.ico', icoBuffer);
```

#### Parsing

```JavaScript
const { parseIco } = require('icor');
const fs = require('fs');

const icoBuffer = fs.readFileSync('output.ico');
const parsed = parseIco(icoBuffer);

console.log('Contains:', parsed.getInfo());
// [
//   { width: 32, height: 32, bpp: 32, dataSize: 1234 },
//   { width: 64, height: 64, bpp: 32, dataSize: 5678 }
// ]
```

### ICNS

#### Compiling

```JavaScript
const { compileIcns } = require('icor');

const images = [
  {
    size: 32,
    data: Buffer.from('ICON_DATA_HERE')
  },
  {
    size: 256,
    data: Buffer.from('ICON_DATA_HERE')
  }
];

const icnsBuffer = compileIcns(images);
```

#### Parsing

```JavaScript
const { parseIcns } = require('icor');

const parsed = parseIcns(icnsBuffer);
console.log(parsed.getInfo());
// [
//   { type: 'icp4', size: 32, dataSize: 1234 },
//   { type: 'ic08', size: 256, dataSize: 5678 }
// ]
```

## API Documentation

### `compileIco(images)`

**Parameters:**

- `images`: Array of image objects with:
  - `width` (Number)
  - `height` (Number)
  - `data` (Buffer) - PNG image data

**Returns:**  
Buffer containing complete ICO file

### `parseIco(buffer)`

**Parameters:**

- `buffer`: Buffer containing ICO file data

**Returns:**  
Object with:

- `images`: Array of parsed images
- `getImage(width, height)`: Retrieve specific image
- `getInfo()`: Get metadata array

### `compileIcns(images)`

**Parameters:**

- `images`: Array of image objects with:
  - `size` (Number) - One of [16, 32, 64, 128, 256, 512, 1024]
  - `data` (Buffer) - JPEG 2000 or PNG data

**Returns:**  
Buffer containing valid ICNS file

### `parseIcns(buffer)`

**Parameters:**

- `buffer`: Buffer containing ICNS file data

**Returns:**  
Object with:

- `images`: Array of parsed chunks
- `getImage(size)`: Retrieve specific image
- `getInfo()`: Get metadata array

## Error Handling

All functions throw descriptive errors for common issues:

```javascript
try {
  compileIco([{ width: 64, height: 64 }]); // Missing data
} catch (e) {
  console.log(e.message);
  // "Image at index 0 missing required property: data"
}

try {
  parseIco(Buffer.from("invalid"));
} catch (e) {
  console.log(e.message);
  // "ICO file is too small to contain header"
}
```

## Notes

- **Image Requirements:**
  - ICO: PNG format recommended
  - ICNS: Apple prefers JPEG 2000 (`.jp2`) for retina sizes
- **Size Limitations:**
  - ICO: Maximum 256x256 pixels (Windows XP+ supports 512px via PNG)
  - ICNS: Up to 1024x1024@2x (retina)

## License

ICOR is open-source software licensed under the **[ISC License](https://opensource.org/licenses/ISC)** - a simple, permissive free software license that is functionally equivalent to the MIT/Expat license.
