const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const express = require("express");
const path = require("path");
const cors = require("cors");
const expressHandlebars = require("express-handlebars");

const app = express();
const port = process.env.PORT || 5050;

const hbs = expressHandlebars.create({
  helpers: {
    round: function (number) {
      return Math.round(number) / 100;
    },
    date: function (dateString) {
      const date = new Date(dateString);

      return `${date.getMonth() + 1}/${
        date.getDate() + 1
      }/${date.getFullYear()}`;
    },
    ifCond: (v1, v2, options) => {
      if (v1 > v2) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
  },
});

// hbs.helpers("ifCond", (v1, v2, options) => {
//   if (v1 > v2) {
//     return options.fn(this);
//   }
//   return options.inverse(this);
// });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));

const base64Encode = (file) => {
  let body = fs.readFileSync(file);
  return body.toString("base64");
};

const compile = async (templateName, data) => {
  const filePath = path.join(
    process.cwd(),
    "views",
    `${templateName}.handlebars`
  );

  const html = await fs.readFile(filePath, "utf8");

  return hbs.handlebars.compile(html)(data);
};

app.post("/", async (req, res) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const { data: user } = req.body;

    const content = await compile("index", {
      userDetails: user?.user_details || {},
      accountDetails: user?.account_details || {},
      startDate: user?.start_date,
      endDate: user?.end_date,
      vault:
        user?.vault_transactions?.map((x) => ({
          ...x,
          desc: (x.desc || "").toLowerCase(),
          created_at: x.created_at.split("T")[0],
          credit: x.description === "credit" ? `₦${x.amount}` : null,
          debit: x.description === "debit" ? `₦${x.amount}` : null,
        })) || [],
      float:
        user?.float_transactions?.map((x) => ({
          ...x,
          desc: (x.desc || "").toLowerCase(),
          created_at: x.created_at.split("T")[0],
          credit: x.description === "credit" ? `₦${x.amount}` : null,
          debit: x.description === "debit" ? `₦${x.amount}` : null,
        })) || [],
      plans:
        user?.plans_transactions?.map((x) => ({
          ...x,
          desc: (x.desc || "").toLowerCase(),
          created_at: x.created_at.split("T")[0],
          credit: x.description === "credit" ? `₦${x.amount}` : null,
          debit: x.description === "debit" ? `₦${x.amount}` : null,
        })) || [],
    });

    await page.setContent(content);
    await page.pdf({
      path: "report.pdf",
      format: "a4",
      printBackground: true,
    });
    await browser.close();

    const base64String = base64Encode("report.pdf");
    return res.json({ success: "Worked!!", data: base64String });
  } catch (error) {
    return res.json({ error: "Failed!!", error: error.message });
  }

  //   const html = fs.readFileSync("report.html", "utf8");
  //   const { data: user } = req.body;
  //   const options = {
  //     format: "A3",
  //     orientation: "portrait",
  //     border: "10mm",
  //     phantomPath: "./node_modules/phantomjs-prebuilt/bin/phantomjs",
  //     header: {
  //       contents: {
  //         default: `
  //             <div id="header_content" class="header">
  //               <img
  //                 src="https://herconomy.com/wp-content/uploads/herconomyemails/herclogo1.png"
  //                 alt=""
  //               />
  //               <p class="header-first-p">226 Awolo/Bourdilon Road Ikoyi, Lagos State.</p>
  //               <p>+2349047432047</p>
  //             </div>
  //             `,
  //       },
  //     },
  //     footer: {
  //       height: "50px",
  //       contents: {
  //         default: `
  //             <hr />
  //           <div style="text-align: right; padding-top: 25px;">
  //             <b>Page</b> <span style="color: #444;">{{page}}</span> Of <span>{{pages}}</span>
  //           </div>`,
  //       },
  //     },
  //   };
  //   const document = {
  //     html,
  //     data: {
  //       userDetails: user?.user_details || {},
  //       accountDetails: user?.account_details || {},
  //       startDate: user?.start_date,
  //       endDate: user?.end_date,
  //       vault:
  //         user?.vault_transactions?.map((x) => ({
  //           ...x,
  //           desc: (x.desc || "").toLowerCase(),
  //           created_at: x.created_at.split("T")[0],
  //           credit: x.description === "credit" ? `₦${x.amount}` : null,
  //           debit: x.description === "debit" ? `₦${x.amount}` : null,
  //         })) || [],
  //       float:
  //         user?.float_transactions?.map((x) => ({
  //           ...x,
  //           desc: (x.desc || "").toLowerCase(),
  //           created_at: x.created_at.split("T")[0],
  //           credit: x.description === "credit" ? `₦${x.amount}` : null,
  //           debit: x.description === "debit" ? `₦${x.amount}` : null,
  //         })) || [],
  //       plans:
  //         user?.plans_transactions?.map((x) => ({
  //           ...x,
  //           desc: (x.desc || "").toLowerCase(),
  //           created_at: x.created_at.split("T")[0],
  //           credit: x.description === "credit" ? `₦${x.amount}` : null,
  //           debit: x.description === "debit" ? `₦${x.amount}` : null,
  //         })) || [],
  //     },
  //     path: "./report.pdf",
  //     type: "",
  //   };
  //   pdf
  //     .create(document, options)
  //     .then(() => {
  //       const base64String = base64Encode("report.pdf");
  //       return res.json({ success: "Worked!!", data: base64String });
  //     })
  //     .catch((error) => {
  //       return res.json({ error: "Failed!!", error: error.message });
  //     });
});

app.listen(port, () => {
  console.log("listening....");
});
