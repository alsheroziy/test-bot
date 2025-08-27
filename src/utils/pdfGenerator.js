const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

class PDFGenerator {
  static async generateTestResultsPDF(testResults, testInfo) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50,
          },
        });

        // Create a unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `test_results_${timestamp}.pdf`;
        const filepath = path.join(__dirname, "..", "..", "temp", filename);

        // Ensure temp directory exists
        const tempDir = path.dirname(filepath);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        // Header
        doc
          .fontSize(14)
          .font("Times-Roman")
          .text("Milliy sertifikat", { align: "left" })
          .underline(50, 50, 100, 0, { color: "black" });

        doc
          .fontSize(10)
          .text("Test Bot Admin", { align: "right" })
          .underline(450, 50, 100, 0, { color: "black" });

        // Main title
        doc
          .fontSize(16)
          .font("Times-Bold")
          .text(
            "TEST BOT ORQALI O'TKAZILGAN IMTIHONDA TALABGORLARNING RASH MODELI BO'YICHA TEKSHIRILGAN TEST NATIJALARI",
            {
              align: "center",
              underline: true,
            }
          );

        // Test info
        doc.moveDown(0.5);
        doc
          .fontSize(12)
          .font("Times-Roman")
          .text(`Test: ${testInfo.title}`, { align: "center" });
        doc.text(`Fan: ${testInfo.subject}`, { align: "center" });
        doc.text(`Sana: ${new Date().toLocaleDateString("uz-UZ")}`, {
          align: "center",
        });

        doc.moveDown(1);

        // Table headers
        const tableTop = doc.y;
        const colWidths = [40, 200, 80, 60, 60];
        const colX = [50, 90, 290, 370, 430];

        // Draw table borders
        doc.rect(50, tableTop, 440, 25).stroke();

        // Header text
        doc
          .fontSize(10)
          .font("Times-Bold")
          .text("№", colX[0], tableTop + 5, {
            width: colWidths[0],
            align: "center",
          })
          .text("Ism va familiya", colX[1], tableTop + 5, {
            width: colWidths[1],
            align: "center",
          })
          .text("To'g'ri javoblar soni", colX[2], tableTop + 5, {
            width: colWidths[2],
            align: "center",
          })
          .text("Ball", colX[3], tableTop + 5, {
            width: colWidths[3],
            align: "center",
          })
          .text("Daraja", colX[4], tableTop + 5, {
            width: colWidths[4],
            align: "center",
          });

        // Vertical lines
        doc
          .moveTo(colX[1], tableTop)
          .lineTo(colX[1], tableTop + 25)
          .stroke();
        doc
          .moveTo(colX[2], tableTop)
          .lineTo(colX[2], tableTop + 25)
          .stroke();
        doc
          .moveTo(colX[3], tableTop)
          .lineTo(colX[3], tableTop + 25)
          .stroke();
        doc
          .moveTo(colX[4], tableTop)
          .lineTo(colX[4], tableTop + 25)
          .stroke();

        // Data rows
        let currentY = tableTop + 25;
        doc.fontSize(10).font("Times-Roman");

        testResults.forEach((result, index) => {
          // Check if we need a new page
          if (currentY > 700) {
            doc.addPage();
            currentY = 50;
          }

          // Row background
          doc.rect(50, currentY, 440, 20).stroke();

          // Row data
          doc.text((index + 1).toString(), colX[0], currentY + 5, {
            width: colWidths[0],
            align: "center",
          });

          // Format name (replace spaces with underscores)
          const formattedName = result.userName.replace(/\s+/g, "_");
          doc.text(formattedName, colX[1], currentY + 5, {
            width: colWidths[1],
            align: "left",
          });

          doc.text(result.correctAnswers.toString(), colX[2], currentY + 5, {
            width: colWidths[2],
            align: "center",
          });
          doc.text(result.score.toString(), colX[3], currentY + 5, {
            width: colWidths[3],
            align: "center",
          });
          doc.text(result.grade, colX[4], currentY + 5, {
            width: colWidths[4],
            align: "center",
          });

          // Vertical lines
          doc
            .moveTo(colX[1], currentY)
            .lineTo(colX[1], currentY + 20)
            .stroke();
          doc
            .moveTo(colX[2], currentY)
            .lineTo(colX[2], currentY + 20)
            .stroke();
          doc
            .moveTo(colX[3], currentY)
            .lineTo(colX[3], currentY + 20)
            .stroke();
          doc
            .moveTo(colX[4], currentY)
            .lineTo(colX[4], currentY + 20)
            .stroke();

          currentY += 20;
        });

        // Footer
        doc.moveDown(2);
        doc
          .fontSize(10)
          .font("Times-Roman")
          .text(`Jami talabgorlar soni: ${testResults.length}`, {
            align: "right",
          });

        doc.end();

        stream.on("finish", () => {
          resolve({ filepath, filename });
        });

        stream.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;
