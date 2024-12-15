const puppeteer = require("puppeteer");
const fs = require("fs/promises");
const path = require("path");
const { getAllHanziCharacters } = require("@vearvip/hanzi-utils");

// 确保目录存在，如果不存在则创建它（异步）
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    console.error(`Failed to create directory: ${dirPath}`, err);
    throw err;
  }
}

// 将字体文件转换为 base64 编码字符串
async function fontToBase64(fontPath) {
  const buffer = await fs.readFile(fontPath);
  return `data:application/font-ttf;charset=utf-8;base64,${buffer.toString(
    "base64"
  )}`;
}

// 获取所有汉字字符
const allHanziCharacters = getAllHanziCharacters() 
// const allHanziCharacters = getAllHanziCharacters().splice(0, 5);

async function generateImagesFromChars(chars) {
  // 确保输出目录存在
//   const outputDir = path.resolve(__dirname, "./imgs"); // 这个目录用来存放文津宋体产出的文字图片
  const outputDir = path.resolve(__dirname, "./images"); // 这个目录用来存放天珩全字库产出的文字图片
  await ensureDirectoryExists(outputDir);

  // 启动浏览器
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
    defaultViewport: null,
    ignoreHTTPSErrors: true,
  });

  const page = await browser.newPage();

  // 加载一次字体，并确保其已准备好
  const fontPaths = [
    // path.resolve(__dirname, "fonts/WenJinMinchoP0-Regular.ttf"),
    // path.resolve(__dirname, "fonts/WenJinMinchoP2-Regular.ttf"),
    // path.resolve(__dirname, "fonts/WenJinMinchoP3-Regular.ttf"),
    path.resolve(__dirname, "fonts/TH-Tshyn-P0.ttf"),
    path.resolve(__dirname, "fonts/TH-Tshyn-P1.ttf"),
    path.resolve(__dirname, "fonts/TH-Tshyn-P2.ttf"),
    path.resolve(__dirname, "fonts/TH-Tshyn-P16.ttf"),
  ];

  let usedFontPath;
  for (let fontPath of fontPaths) {
    try {
      const fontBase64 = await fontToBase64(fontPath);
      await page.setContent(`
                <html>
                <head>
                    <style>
                        @font-face {
                            font-family: 'CustomFont';
                            src: url('${fontBase64}') format('truetype');
                        }
                        body {
                            margin: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 120px; /* Set the height to 120px */
                            width: 120px; /* Set the width to 120px */
                            background-color: transparent;
                        }
                        .char {
                            font-family: 'CustomFont', sans-serif;
                            font-size: 90px; /* Adjust size to fit within 120x120 */
                            font-weight: bold;
                            color: #333;
                            margin: 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="char"></div>
                </body>
                </html>
            `);
      await page.waitForFunction(() => document.fonts.ready);
      usedFontPath = fontPath;
      break;
    } catch (err) {
      console.error(`Failed to load font from path: ${fontPath}`, err);
    }
  }

  if (!usedFontPath) {
    console.warn("No suitable font found.");
    await browser.close();
    return;
  }

// 动态更新字符并截图
for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    try {
        // 更新页面中的字符
        await page.evaluate((newChar) => {
            document.querySelector(".char").textContent = newChar;
        }, char);

        // 捕获屏幕截图
        const imagePath = path.join(outputDir, `${char}.png`); // 使用 PNG 格式，它支持透明背景
        await page.screenshot({
            path: imagePath,
            type: "png", // 使用 PNG 格式以确保支持透明背景
            clip: { x: 0, y: 0, width: 120, height: 120 }, // 定义裁剪区域
            omitBackground: true, // 确保背景被省略，即透明
        });

        console.log(
            `Generated image for character: ${char} using font from path: ${usedFontPath}`
        );
    } catch (err) {
        console.error(`Failed to generate image for character: ${char}`, err);
    }
}

  // 关闭浏览器
  await browser.close();
}

generateImagesFromChars(allHanziCharacters)
  .then(() => {
    console.log("All images generated.");
  })
  .catch((err) => {
    console.error("Error during image generation:", err);
  });
