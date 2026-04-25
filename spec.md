## 1. Purpose and Scope

This specification defines a custom, one‑dimensional, single‑line “LetraTag Code” symbology that:

- Can be printed on a DYMO LetraTag 200B (or similar) as plain text.
- Encodes a small integer "ID” into a short sequence of high‑contrast characters.  
- Can be decoded from a smartphone camera stream using simple image processing (no general OCR).  
- Provides two formats:
  - **Short tag**: fewer bits, shorter string.
  - **Long tag**: more bits, longer string.

The specification is intended for **ID** encoding with Dymos like systems.

***

## 2. Constraints and Assumptions

### 2.1 Printer constraints

- Target device: DYMO LetraTag 200B (or similar LetraTag models or brands). [dymo](https://dymo.eu/Dymo-LetraTag-200B-Bluetooth-printer/2172855)
- Tape width: 12 mm.
- Resolution: ~160–200 dpi thermal direct printing (non‑industrial, visible dot structure).
- Output: single line of text, with variable but not guaranteed monospaced glyphs.

### 2.2 Visual constraints

- Print may be slightly blurry, with variable spacing between characters. [youtube](https://www.youtube.com/watch?v=8M4ng1FAc_0)
- Camera input may be low‑light, slightly out of focus, and at a moderate angle.  
- The decoder is allowed to treat the code as a **continuous band of foreground vs background**, not as individual glyph boxes.

### 2.3 Decoder constraints

- Primary target: in‑browser JS (getUserMedia + Canvas).  
- Secondary target: native Android (CameraX) and iOS (AVCapture) with similar algorithms.  
- The decoder may perform:
  - Grayscale conversion  
  - Thresholding / binarization  
  - 1D projection and resampling  
  - Simple start/stop pattern recognition  
  - Bitstream CRC check  

No ML/OCR models are required.

***

## 3. Visual Encoding Model

### 3.1 Symbols

The system uses **two classes of characters** in the printed line:

- **DARK symbol**: a visually dense, high‑ink glyph (e.g. `#` if available in LetraTag symbols, or `#` as a fallback). [labelcity](https://www.labelcity.com/printing-symbols-on-the-dymo-letratag)
- **LIGHT symbol**: a visually much lighter glyph (e.g. `·` or `.`).  
  - A true space character is avoided because LetraTag and its app may collapse or adjust spacing. [dymo](https://www.dymo.com/label-makers-printers/letratag-label-makers/dymo-letratag-200b-bluetooth-label-maker/SP_2607111.html)

The printed code is therefore a string like:

```text
##·#··##·##···#
```

Conceptually:

- **Bit 1** → DARK symbol  
- **Bit 0** → LIGHT symbol  

The actual glyphs are configurable in the implementation but the **contrast ratio** between DARK and LIGHT must be high.

### 3.2 Single‑line layout

The LetraTag code is printed on **one text line**:

```text
<LETAG-CODE-STRING><space><optional human-readable ID>
```

Example:

```text
##·#··##·##···# MY TEXT
```

- Everything before the first space is the **machine‑coded tag**.  
- Anything after the first space is human‑readable and ignored by the machine decoder.

***

## 4. Bitstream Structure

Two variants are defined: **Short Tag** and **Long Tag**.

### 4.1 Common elements

Both variants share:

- A **left guard pattern** to detect the start and calibrate module width.
- An **orientation pattern** to disambiguate mirror/scan direction.
- A **payload** of N bits (your content).
- A **CRC** to validate the payload.
- A **right guard pattern** to detect the end.

Bits are conceptually arranged as:

```text
[LEFT_GUARD][ORIENT][PAYLOAD][CRC][RIGHT_GUARD]
```

Bits are numbered from left (bit 0) to right.

**Guard patterns** are fixed constants so the decoder can:

- Find candidate regions by matching a DARK‑heavy prefix/suffix.  
- Estimate the number of characters per “module” (bit) from the guard pattern length.

***

## 5. Short Tag Specification

### 5.1 Purpose

Short tag: compact code for a moderate payload (up to 1024 unique IDs).

### 5.2 Bit allocation

Total bits: **20 bits**

- `LEFT_GUARD` : 3 bits  
- `ORIENT`     : 2 bits  
- `PAYLOAD`    : 10 bits (ID 0..1023)  
- `CRC`        : 3 bits (CRC‑3 over `PAYLOAD`)  
- `RIGHT_GUARD`: 2 bits  

Layout:

```text
[0..2]   LEFT_GUARD  (3 bits)
[3..4]   ORIENT      (2 bits)
[5..14]  PAYLOAD     (10 bits)
[15..17] CRC         (3 bits)
[18..19] RIGHT_GUARD (2 bits)
```

### 5.3 Concrete bit patterns

- `LEFT_GUARD`  = `111` (three consecutive 1s)  
- `ORIENT`      = `01` (chosen so total prefix `11101` is distinctive)  
- `RIGHT_GUARD` = `11`  

CRC:

- Use CRC‑3 (polynomial \(x^3 + x + 1\), generator `0b1011`).  
- CRC is computed over the 10‑bit payload, MSB first, and stored as 3 bits `[c2 c1 c0]` at positions 15–17.

Capacity:

- 10 data bits → 1024 distinct IDs.

***

## 6. Long Tag Specification

### 6.1 Purpose

Long tag: higher capacity (up to 65,536 IDs) with stronger CRC, at the cost of a longer printed string.

### 6.2 Bit allocation

Total bits: **28 bits**

- `LEFT_GUARD` : 3 bits  
- `ORIENT`     : 2 bits  
- `PAYLOAD`    : 16 bits (ID 0..65535)  
- `CRC`        : 4 bits (CRC‑4)  
- `RIGHT_GUARD`: 3 bits  

Layout:

```text
[0..2]   LEFT_GUARD  (3 bits)
[3..4]   ORIENT      (2 bits)
[5..20]  PAYLOAD     (16 bits)
[21..24] CRC         (4 bits)
[25..27] RIGHT_GUARD (3 bits)
```

### 6.3 Concrete bit patterns

- `LEFT_GUARD`  = `111`  
- `ORIENT`      = `10` (chosen distinct from short tag’s `01`)  
- `RIGHT_GUARD` = `111`  

CRC:

- Use CRC‑4‑ITU (polynomial \(x^4 + x + 1\), generator `0b0011` in reflected form).  
- CRC is computed over the 16‑bit payload, MSB first, and stored as bits 21–24.

Capacity:

- 16 data bits → 65,536 distinct IDs.

***

## 7. Text Encoding Rules

### 7.1 Bit‑to‑character mapping

Define:

- `DARK_CHAR`   = printing glyph for bit `1`.  
- `LIGHT_CHAR`  = printing glyph for bit `0`.  

Recommended defaults for LetraTag:

- `DARK_CHAR`  = `#` (robust, high ink, widely supported). [manuals](https://manuals.plus/dymo/dymo-letratag-xr-handheld-label-maker-user-manual)
- `LIGHT_CHAR` = `.` (light but visible; avoids spacing collapse issues). [youtube](https://www.youtube.com/watch?v=8M4ng1FAc_0)

Then:

- For each bit in the bitstream, output `DARK_CHAR` for `1`, `LIGHT_CHAR` for `0`.  
- Concatenate all characters to form the code string.

### 7.2 Code string construction

For a given ID:

1. Choose tag variant (**short** or **long**) based on configuration.  
2. Encode ID into PAYLOAD bits (zero‑pad to 10/16 bits as needed).  
3. Compute CRC bits.  
4. Concatenate guard + orient + payload + CRC + guard.  
5. Map bits to characters via `DARK_CHAR`/`LIGHT_CHAR`.  
6. Optionally append a space + human‑readable ID (e.g. `01234`).

Example (short tag, ID 42):

- Payload (10 bits): `0000101010`  
- Suppose CRC = `101`  
- Bitstream: `111` `01` `0000101010` `101` `11`  
- Text: `###.#.. ..#.#..##` (spaces added here for illustration only; real code is contiguous).

***

## 8. Decoding Algorithm (High‑Level)

The decoder treats the printed code as an **image**, not as text.

### 8.1 Preprocessing

1. Capture frame from camera.  
2. Convert to grayscale.  
3. Apply adaptive thresholding (e.g. Otsu) to obtain binary image (foreground vs background). [dynamsoft](https://www.dynamsoft.com/codepool/barcode-scanning-accuracy-benchmark-and-comparison.html)
4. Optionally deskew horizontally using a Hough line on the text baseline.

### 8.2 Code region detection

Because the code is a short string:

- Detect the line containing the code (e.g. by finding the longest horizontal run of foreground pixels in expected region, or by user pointing camera close enough that the code line dominates).  
- Extract a tight **bounding box** around that horizontal band.

### 8.3 1D projection and resampling

1. Project the band vertically: for each column, sum the foreground pixel counts → 1D intensity profile.  
2. Smooth the profile (small Gaussian or box filter).  
3. Normalize to 0..1.  
4. Binarize profile at a threshold (e.g. mid‑point) to get a **1D bitmask** of “dark” vs “light” columns.

### 8.4 Module segmentation

Because glyph widths are not constant, we cannot assume a single pixel count per bit. Instead:

1. Search for the **LEFT_GUARD pattern** (`111`) by scanning the profile for a contiguous region of high “dark” density of minimum length.  
2. Once a candidate LEFT_GUARD is found, measure its total width in pixels; divide by its logical length (3 bits) to get an approximate **module width**.  
3. Using this module width, sample candidate bit positions to the right, rounding to nearest column center.  
4. Read bits by averaging the profile over ±k pixels around each nominal center and thresholding.

### 8.5 Variant detection and CRC

1. Read the first 5 bits after LEFT_GUARD: this is `ORIENT` plus the last bit of the guard; or more simply, read the whole bitstream and check both short and long patterns:  
   - If pattern matches `11101` prefix and length ~20 bits → short variant.  
   - If pattern matches `11110` prefix and length ~28 bits → long variant.  
2. Extract PAYLOAD and CRC bits according to the variant layout.  
3. Recompute CRC and compare with embedded CRC.  
4. If CRC fails, optionally:
   - Try reading from right to left (handle reversed scan).  
   - Try small shifts in module width and re‑sample.  
5. If CRC passes, output the decoded ID.

### 8.6 Error handling

- If decoding fails on a single frame, the application may aggregate over **N frames** (e.g. 3–5 consecutive frames) and perform majority vote per bit before CRC.  
- If still failing, show “Tag not recognized” and prompt user to adjust distance/angle.
