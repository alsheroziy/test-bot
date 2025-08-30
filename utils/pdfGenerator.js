const PDFDocument = require("pdfkit");

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

        // Create buffer chunks array
        const chunks = [];

        // Collect PDF data in chunks
        doc.on("data", (chunk) => {
          chunks.push(chunk);
        });

        doc.on("end", () => {
          // Combine all chunks into a single buffer
          const pdfBuffer = Buffer.concat(chunks);
          resolve({ pdfBuffer });
        });

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
        const colWidths = [40, 120, 50, 60, 60, 60, 60];
        const colX = [50, 90, 210, 260, 320, 380, 440];

        // Draw table borders
        doc.rect(50, tableTop, 440, 25).stroke();

        // Header text
        doc
          .fontSize(9)
          .font("Times-Bold")
          .text("№", colX[0], tableTop + 5, {
            width: colWidths[0],
            align: "center",
          })
          .text("Ism va familiya", colX[1], tableTop + 5, {
            width: colWidths[1],
            align: "center",
          })
          .text("Testlar", colX[2], tableTop + 5, {
            width: colWidths[2],
            align: "center",
          })
          .text("O'rtacha", colX[3], tableTop + 5, {
            width: colWidths[3],
            align: "center",
          })
          .text("Eng yaxshi", colX[4], tableTop + 5, {
            width: colWidths[4],
            align: "center",
          })
          .text("Qobiliyat", colX[5], tableTop + 5, {
            width: colWidths[5],
            align: "center",
          })
          .text("Daraja", colX[6], tableTop + 5, {
            width: colWidths[6],
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
        doc
          .moveTo(colX[5], tableTop)
          .lineTo(colX[5], tableTop + 25)
          .stroke();
        doc
          .moveTo(colX[6], tableTop)
          .lineTo(colX[6], tableTop + 25)
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

          doc.text(result.testsTaken.toString(), colX[2], currentY + 5, {
            width: colWidths[2],
            align: "center",
          });
          doc.text(result.averageScore.toString(), colX[3], currentY + 5, {
            width: colWidths[3],
            align: "center",
          });
          doc.text(result.bestScore.toString(), colX[4], currentY + 5, {
            width: colWidths[4],
            align: "center",
          });
          doc.text(
            (result.averageAbility || 0).toFixed(2),
            colX[5],
            currentY + 5,
            {
              width: colWidths[5],
              align: "center",
            }
          );
          doc.text(result.bestGrade, colX[6], currentY + 5, {
            width: colWidths[6],
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
          doc
            .moveTo(colX[5], currentY)
            .lineTo(colX[5], currentY + 20)
            .stroke();
          doc
            .moveTo(colX[6], currentY)
            .lineTo(colX[6], currentY + 20)
            .stroke();

          currentY += 20;
        });

        // Footer
        doc.moveDown(2);
        doc
          .fontSize(10)
          .font("Times-Roman")
          .text(`Jami foydalanuvchilar soni: ${testResults.length}`, {
            align: "right",
          });

        doc.end();

        doc.on("error", (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = PDFGenerator;
