const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const request = require("request");
const forge = require("node-forge");
//
const SII_HOME =
  "https://herculesr.sii.cl/cgi_AUT2000/CAutInicio.cgi?https://misiir.sii.cl/cgi_misii/siihome.cgi";
const LOGIN_CERT =
  "https://zeusr.sii.cl//AUT2000/InicioAutenticacion/IngresoCertificado.html?https://misiir.sii.cl/cgi_misii/siihome.cgi";
const getCookies = async (instance_id) => {
  let browser = null;
  let page = null;
  try {
    var err_cookie = null;
    var cookies = [];
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--incognito"],
    });
    page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on("dialog", async (dialog) => {
      console.log(dialog.message());
      if (
        dialog.message().indexOf("Para identificarse utilizando certificado") !=
        -1
      ) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
    let cert = null;
    try {
      cert = fs.readFileSync(path.join(__dirname, instance_id + ".cer"));
    } catch (error) {
      console.log(error);
      await browser.close();
      return null;
    }
    let key = null;
    try {
      key = fs.readFileSync(path.join(__dirname, instance_id + ".key"));
    } catch (error) {
      console.log(error);
      await browser.close();
      return null;
    }
    const pass = instance_id;
    page.on("request", (interceptedRequest) => {
      const options = {
        uri: interceptedRequest.url(),
        method: interceptedRequest.method(),
        headers: interceptedRequest.headers(),
        body: interceptedRequest.postData(),
        agentOptions: {
          cert: cert,
          key: key,
          passphrase: pass.toString(),
        },
        gzip: true,
      };
      request(options, async function (err, resp, body) {
        if (err) {
          err_cookie = err;
          return interceptedRequest.abort("connectionrefused");
        } else {
          if (interceptedRequest.url() == SII_HOME) {
            fs.writeFileSync("options.json", JSON.stringify(options));
            var cookies_par = resp.headers["set-cookie"];

            if (cookies_par != undefined) {
              cookies_par.forEach((coo_obj) => {
                var sep_cookie = coo_obj.split(";");
                var cookie = {
                  name: sep_cookie[0].split("=")[0].trim(),
                  value: sep_cookie[0].split("=")[1].trim(),
                  path: sep_cookie[1].split("=")[1].trim(),
                  domain: sep_cookie[2].split("=")[1].trim(),
                  secure: coo_obj.indexOf("secure") != -1 ? true : false,
                  expires: -1,
                };
                cookies.push(cookie);
              });
            } else {
              return null;
            }
          }
          interceptedRequest.respond({
            status: resp.statusCode,
            contentType: resp.headers["content-type"],
            headers: resp.headers,
            body: body,
          });
        }
      });
    });
    var urlPage = LOGIN_CERT;
    await page.goto(urlPage, { waitUntil: "load", timeout: 0 });
    await browser.close();
    if (err_cookie) {
      if (browser) await browser.close();
      return null;
    }
    console.log(cookies);
    return cookies;
  } catch (error) {
    if (browser) await browser.close();
    console.log(error);
    return null;
  }
};

const cookies = async (options) => {
  let cookies = {};
  return new Promise((resolve, reject) => {
    request(options, async function (err, resp, body) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        let cookies_par = resp.headers["set-cookie"];
        if (cookies_par != undefined) {
          cookies_par.forEach((coo_obj) => {
            let sep_cookie = coo_obj.split(";");
            cookies[sep_cookie[0].split("=")[0].trim()] = {
              value: sep_cookie[0].split("=")[1].trim(),
              path: sep_cookie[1].split("=")[1].trim(),
              domain: sep_cookie[2].split("=")[1].trim(),
              secure: coo_obj.indexOf("secure") != -1 ? true : false,
              expires: -1,
            };
            resolve(cookies);
          });
        } else {
          reject(cookies_par);
        }
      }
    });
  });
};

function getFormattedDate() {
  const date = new Date();

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const dayName = days[date.getUTCDay()];
  const day = date.getUTCDate().toString().padStart(2, "0");
  const monthName = months[date.getUTCMonth()];
  const year = date.getUTCFullYear().toString();
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");

  return `${dayName}, ${day} ${monthName} ${year} ${hours}:${minutes}:${seconds} GMT`;
}

const cafInfo = async (cookies) => {
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "es-419,es;q=0.9",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie:
      "cert_Origin=www.sii.cl; s_cc=true; NETSCAPE_LIVEWIRE.rut=" +
      cookies["NETSCAPE_LIVEWIRE.rut"].value +
      "; NETSCAPE_LIVEWIRE.rutm=" +
      cookies["NETSCAPE_LIVEWIRE.rutm"].value +
      "; NETSCAPE_LIVEWIRE.dv=" +
      cookies["NETSCAPE_LIVEWIRE.dv"].value +
      "; NETSCAPE_LIVEWIRE.dvm=" +
      cookies["NETSCAPE_LIVEWIRE.dvm"].value +
      "; NETSCAPE_LIVEWIRE.clave=" +
      cookies["NETSCAPE_LIVEWIRE.clave"].value +
      "; NETSCAPE_LIVEWIRE.mac=" +
      cookies["NETSCAPE_LIVEWIRE.mac"].value +
      "; NETSCAPE_LIVEWIRE.exp=" +
      cookies["NETSCAPE_LIVEWIRE.exp"].value +
      "; NETSCAPE_LIVEWIRE.sec=" +
      cookies["NETSCAPE_LIVEWIRE.sec"].value +
      "; NETSCAPE_LIVEWIRE.lms=" +
      cookies["NETSCAPE_LIVEWIRE.lms"].value +
      "; TOKEN=" +
      cookies["TOKEN"].value +
      "; CSESSIONID=" +
      cookies["CSESSIONID"].value +
      "; NETSCAPE_LIVEWIRE.locexp=" +
      encodeURIComponent(getFormattedDate()) +
      "; s_sq=siiprd%3D%2526c.%2526a.%2526activitymap.%2526page%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526link%253DTimbraje%252520electr%2525C3%2525B3nico%252520%252528%25252A%252529%2526region%253DheadingConsultas%2526.activitymap%2526.a%2526.c%2526pid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526oid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%252523collapseConsultas%2526ot%253DA; dtCookie=v_4_srv_41_sn_325FF3513906E6048C6F23912C6F9EAD_perc_100000_ol_0_mul_1_app-3Aea7c4b59f27d43eb_0",
    Host: "palena.sii.cl",
    Origin: "https://palena.sii.cl",
    Referer: "https://palena.sii.cl/cvc_cgi/dte/of_solicita_folios_dcto",
    "Sec-Ch-Ua":
      '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "Windows",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  };
  return new Promise((resolve, reject) => {
    request(
      {
        headers,
        uri: "https://palena.sii.cl/cvc_cgi/dte/of_solicita_folios_dcto",
        method: "POST",
        body: "RUT_EMP=76357023&DV_EMP=1&FOLIO_INICIAL=0&COD_DOCTO=33&AFECTO_IVA=S&ANOTACION=N&CON_CREDITO=0&CON_AJUSTE=0&FACTOR=&CANT_DOCTOS=",
      },
      async function (err, resp, body) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log(resp.body);
        }
      }
    );
  });
};

const downloadXml = async (cookies) => {
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "es-419,es;q=0.9",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie:
      "cert_Origin=www.sii.cl; s_cc=true; NETSCAPE_LIVEWIRE.rut=" +
      cookies["NETSCAPE_LIVEWIRE.rut"].value +
      "; NETSCAPE_LIVEWIRE.rutm=" +
      cookies["NETSCAPE_LIVEWIRE.rutm"].value +
      "; NETSCAPE_LIVEWIRE.dv=" +
      cookies["NETSCAPE_LIVEWIRE.dv"].value +
      "; NETSCAPE_LIVEWIRE.dvm=" +
      cookies["NETSCAPE_LIVEWIRE.dvm"].value +
      "; NETSCAPE_LIVEWIRE.clave=" +
      cookies["NETSCAPE_LIVEWIRE.clave"].value +
      "; NETSCAPE_LIVEWIRE.mac=" +
      cookies["NETSCAPE_LIVEWIRE.mac"].value +
      "; NETSCAPE_LIVEWIRE.exp=" +
      cookies["NETSCAPE_LIVEWIRE.exp"].value +
      "; NETSCAPE_LIVEWIRE.sec=" +
      cookies["NETSCAPE_LIVEWIRE.sec"].value +
      "; NETSCAPE_LIVEWIRE.lms=" +
      cookies["NETSCAPE_LIVEWIRE.lms"].value +
      "; TOKEN=" +
      cookies["TOKEN"].value +
      "; CSESSIONID=" +
      cookies["CSESSIONID"].value +
      "; NETSCAPE_LIVEWIRE.locexp=" +
      encodeURIComponent(getFormattedDate()) +
      "; s_sq=siiprd%3D%2526c.%2526a.%2526activitymap.%2526page%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526link%253DTimbraje%252520electr%2525C3%2525B3nico%252520%252528%25252A%252529%2526region%253DheadingConsultas%2526.activitymap%2526.a%2526.c%2526pid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526oid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%252523collapseConsultas%2526ot%253DA; dtCookie=v_4_srv_41_sn_325FF3513906E6048C6F23912C6F9EAD_perc_100000_ol_0_mul_1_app-3Aea7c4b59f27d43eb_0",
    "Sec-Ch-Ua":
      '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "Windows",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  };
  const filename = "xml-descargado-sin-scrapping.xml";
  request({
    headers,
    uri: "https://www1.sii.cl/cgi-bin/Portal001/download.cgi?RUT_EMP=76661723&DV_EMP=9&ORIGEN=ENV&RUT_RECP=&FOLIO=1&FOLIOHASTA=44&RZN_SOC=&FEC_DESDE=&FEC_HASTA=&TPO_DOC=33&ESTADO=&ORDEN=&DOWNLOAD=XML",
    method: "GET",
  })
    .on("error", (err) => {
      console.error(err);
    })
    .pipe(fs.createWriteStream(filename))
    .on("finish", () => {
      console.log(`Archivo descargado: ${filename}`);
    });
};

const reobtenerCaf = async (cookies) => {
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "es-419,es;q=0.9",
    "Cache-Control": "max-age=0",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie:
      "cert_Origin=www.sii.cl; s_cc=true; NETSCAPE_LIVEWIRE.rut=" +
      cookies["NETSCAPE_LIVEWIRE.rut"].value +
      "; NETSCAPE_LIVEWIRE.rutm=" +
      cookies["NETSCAPE_LIVEWIRE.rutm"].value +
      "; NETSCAPE_LIVEWIRE.dv=" +
      cookies["NETSCAPE_LIVEWIRE.dv"].value +
      "; NETSCAPE_LIVEWIRE.dvm=" +
      cookies["NETSCAPE_LIVEWIRE.dvm"].value +
      "; NETSCAPE_LIVEWIRE.clave=" +
      cookies["NETSCAPE_LIVEWIRE.clave"].value +
      "; NETSCAPE_LIVEWIRE.mac=" +
      cookies["NETSCAPE_LIVEWIRE.mac"].value +
      "; NETSCAPE_LIVEWIRE.exp=" +
      cookies["NETSCAPE_LIVEWIRE.exp"].value +
      "; NETSCAPE_LIVEWIRE.sec=" +
      cookies["NETSCAPE_LIVEWIRE.sec"].value +
      "; NETSCAPE_LIVEWIRE.lms=" +
      cookies["NETSCAPE_LIVEWIRE.lms"].value +
      "; TOKEN=" +
      cookies["TOKEN"].value +
      "; CSESSIONID=" +
      cookies["CSESSIONID"].value +
      "; NETSCAPE_LIVEWIRE.locexp=" +
      encodeURIComponent(getFormattedDate()) +
      "; s_sq=siiprd%3D%2526c.%2526a.%2526activitymap.%2526page%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526link%253DTimbraje%252520electr%2525C3%2525B3nico%252520%252528%25252A%252529%2526region%253DheadingConsultas%2526.activitymap%2526.a%2526.c%2526pid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526oid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%252523collapseConsultas%2526ot%253DA; dtCookie=v_4_srv_41_sn_325FF3513906E6048C6F23912C6F9EAD_perc_100000_ol_0_mul_1_app-3Aea7c4b59f27d43eb_0",
    Host: "palena.sii.cl",
    Origin: "https://palena.sii.cl",
    Referer: "https://palena.sii.cl/cvc_cgi/dte/rf_genera_folio",
    "Sec-Ch-Ua":
      '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "Windows",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  };
  const filename = "caf-descargado-sin-scrapping.xml"; // Nombre del archivo local
  request({
    headers,
    uri: "https://palena.sii.cl/cvc_cgi/dte/rf_genera_archivo",
    method: "POST",
    body: "RUT_EMP=76357023&DV_EMP=1&COD_DOCTO=33&FOLIO_INI=471&FOLIO_FIN=525&FECHA=2021-11-10&ACEPTAR=AQUI",
  })
    .on("error", (err) => {
      console.error(err);
    })
    .pipe(fs.createWriteStream(filename))
    .on("finish", () => {
      console.log(`Archivo descargado: ${filename}`);
    });
};

const testCertificate = async () => {
  // Lee el archivo del certificado digital
  const cert = fs.readFileSync("6240.cer");

  // Convierte el archivo a un objeto Forge
  const certificate = forge.pki.certificateFromPem(cert.toString());

  // Obtiene el RUT del titular del certificado
  const subjectAttrs = certificate.subject.attributes;
  console.log("subjectAttrs", subjectAttrs);
  const rutAttr = subjectAttrs.find((attr) => attr.type === "2.5.4.45");
  const rut = rutAttr.value;
  console.log("rut", rut);
  // Obtiene el RUT del representante legal de la empresa
  const rutRepresentanteLegal = "11.111.111-1"; // Reemplaza con el RUT del representante legal

  // Verifica si el RUT del titular del certificado corresponde al RUT del representante legal
  if (rut === rutRepresentanteLegal) {
    console.log(
      "El certificado digital corresponde al representante legal de la empresa"
    );
  } else {
    console.log(
      "El certificado digital NO corresponde al representante legal de la empresa"
    );
  }
};

const previewEmitFactAfect = async (cookies) => {
  const cooks =
    "s_cc=true; NETSCAPE_LIVEWIRE.rut=" +
    cookies["NETSCAPE_LIVEWIRE.rut"].value +
    "; NETSCAPE_LIVEWIRE.rutm=" +
    cookies["NETSCAPE_LIVEWIRE.rutm"].value +
    "; NETSCAPE_LIVEWIRE.dv=" +
    cookies["NETSCAPE_LIVEWIRE.dv"].value +
    "; NETSCAPE_LIVEWIRE.dvm=" +
    cookies["NETSCAPE_LIVEWIRE.dvm"].value +
    "; NETSCAPE_LIVEWIRE.clave=" +
    cookies["NETSCAPE_LIVEWIRE.clave"].value +
    "; NETSCAPE_LIVEWIRE.mac=" +
    cookies["NETSCAPE_LIVEWIRE.mac"].value +
    "; NETSCAPE_LIVEWIRE.exp=" +
    cookies["NETSCAPE_LIVEWIRE.exp"].value +
    "; NETSCAPE_LIVEWIRE.sec=" +
    cookies["NETSCAPE_LIVEWIRE.sec"].value +
    "; NETSCAPE_LIVEWIRE.lms=" +
    cookies["NETSCAPE_LIVEWIRE.lms"].value +
    "; TOKEN=" +
    cookies["TOKEN"].value +
    "; CSESSIONID=" +
    cookies["CSESSIONID"].value +
    "; NETSCAPE_LIVEWIRE.locexp=" +
    encodeURIComponent(getFormattedDate()) +
    "; NETSCAPE_LIVEWIRE.ult=Wed Jun 07 2023 13:02:48 GMT-0400 (hora de Venezuela); EMG=15986436; dtCookie=v_4_srv_43_sn_A2EA8FA0F2EFE03277C8F4DA15B21385_perc_100000_ol_0_mul_1_app-3A0089562635ebe3da_0_app-3Aea7c4b59f27d43eb_0; s_sq=siiprd%3D%2526c.%2526a.%2526activitymap.%2526page%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1183.html%2526link%253DEmisi%2525C3%2525B3n%252520de%252520documentos%252520tributarios%252520electr%2525C3%2525B3nicos%252520%252528DTE%252529%252520%252528%25252A%252529%2526region%253DheadingOne%2526.activitymap%2526.a%2526.c%2526pid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1183.html%2526oid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1183.html%252523collapseOne%2526ot%253DA; NETSCAPE_LIVEWIRE.rcmp=76661723; NETSCAPE_LIVEWIRE.dcmp=9";
  const oldcooks =
    "cert_Origin=www.sii.cl; s_cc=true; NETSCAPE_LIVEWIRE.rut=" +
    cookies["NETSCAPE_LIVEWIRE.rut"].value +
    "; NETSCAPE_LIVEWIRE.rutm=" +
    cookies["NETSCAPE_LIVEWIRE.rutm"].value +
    "; NETSCAPE_LIVEWIRE.dv=" +
    cookies["NETSCAPE_LIVEWIRE.dv"].value +
    "; NETSCAPE_LIVEWIRE.dvm=" +
    cookies["NETSCAPE_LIVEWIRE.dvm"].value +
    "; NETSCAPE_LIVEWIRE.clave=" +
    cookies["NETSCAPE_LIVEWIRE.clave"].value +
    "; NETSCAPE_LIVEWIRE.mac=" +
    cookies["NETSCAPE_LIVEWIRE.mac"].value +
    "; NETSCAPE_LIVEWIRE.exp=" +
    cookies["NETSCAPE_LIVEWIRE.exp"].value +
    "; NETSCAPE_LIVEWIRE.sec=" +
    cookies["NETSCAPE_LIVEWIRE.sec"].value +
    "; NETSCAPE_LIVEWIRE.lms=" +
    cookies["NETSCAPE_LIVEWIRE.lms"].value +
    "; TOKEN=" +
    cookies["TOKEN"].value +
    "; CSESSIONID=" +
    cookies["CSESSIONID"].value +
    "; NETSCAPE_LIVEWIRE.locexp=" +
    encodeURIComponent(getFormattedDate()) +
    "; s_sq=siiprd%3D%2526c.%2526a.%2526activitymap.%2526page%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526link%253DTimbraje%252520electr%2525C3%2525B3nico%252520%252528%25252A%252529%2526region%253DheadingConsultas%2526.activitymap%2526.a%2526.c%2526pid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%2526oid%253Dhttps%25253A%25252F%25252Fwww.sii.cl%25252Fservicios_online%25252F1039-1184.html%252523collapseConsultas%2526ot%253DA; dtCookie=v_4_srv_41_sn_325FF3513906E6048C6F23912C6F9EAD_perc_100000_ol_0_mul_1_app-3Aea7c4b59f27d43eb_0";
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "es-419,es;q=0.9",
    "Cache-Control": "max-age=0",
    'charset': 'utf-8',
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cooks,
    Host: "www1.sii.cl",
    Origin: "https://www1.sii.cl",
    Referer: "https://www1.sii.cl/cgi-bin/Portal001/mipeGenFacEx.cgi?",
    "Sec-Ch-Ua":
      '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "Windows",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
  };
  const filename = "pdf-descargado-sin-scrapping.pdf"; // Nombre del archivo local
  request(
    {
      headers,
      uri: "https://www1.sii.cl/cgi-bin/Portal001/mipeDisplayPreView.cgi",
      rejectUnauthorized: false,
      method: "POST",
      body: "esCRED_EC=FALSE&esFACT_TUR=FALSE&PTDC_CODIGO=33&CANT_DET=3&EFXP_CDG_SII_SUCUR=80394077&ES_BORR=FALSE&EHDR_CODIGO=&EFXP_FCH_EMIS=2023-06-07&EFXP_RZN_SOC=FREAKTOOLS+AGENCIA+DIGITAL+SPA&EFXP_DIR_ORIGEN_DEFUALT=SUCRE+363++46+&EFXP_DIR_ORIGEN=SUCRE+363++46+&EFXP_CMNA_ORIGEN=ANTOFAGASTA&EFXP_CIUDAD_ORIGEN=ANTOFAGASTA&EFXP_TIPOVENTA_SELECT=1&EFXP_EMAIL_EMISOR=PTRONCOSO%40FREAKTOOLS.CL&EFXP_FONO_EMISOR=&EFXP_GIRO_EMIS=SERV+INFORMATICOS+Y+DISENO+DE+IMAGEN+EMPR%2C+SERV+GRAFICO+PUBLICITARIO&EFXP_ACTECO=731001&EFXP_ACTECO_SELECT=731001&EFXP_RUT_RECEP=76661723&EFXP_DV_RECEP=9&EFXP_RZN_SOC_RECEP=FREAKTOOLS+AGENCIA+DIGITAL+SPA&EFXP_TIPOCOMPRA_SELECT=1&EFXP_DIR_RECEP_DEFUALT=&EFXP_DIR_RECEP=SUCRE+363++46+&EFXP_CMNA_RECEP=ANTOFAGASTA&EFXP_CIUDAD_RECEP=ANTOFAGASTA&EFXP_GIRO_RECEP_DEFUALT=&EFXP_GIRO_RECEP=SERVICIOS+DE+PUBLICIDAD+PRESTADOS+POR+EM&EFXP_CONTACTO=&EFXP_RUT_SOLICITA=&EFXP_DV_SOLICITA=&EFXP_RUT_TRANSPORTE=&EFXP_DV_TRANSPORTE=&EFXP_PATENTE=&EFXP_RUT_CHOFER=&EFXP_DV_CHOFER=&EFXP_NOMBRE_CHOFER=&EFXP_NMB_01=1&EFXP_QTY_01=1&EFXP_UNMD_01=1&EFXP_PRC_01=1&EFXP_PCTD_01=&EFXP_SUBT_01=1&EFXP_NMB_02=2&EFXP_QTY_02=1&EFXP_UNMD_02=1&EFXP_PRC_02=1&EFXP_PCTD_02=&EFXP_SUBT_02=1&EFXP_NMB_03=3&EFXP_QTY_03=1&EFXP_UNMD_03=1&EFXP_PRC_03=1&EFXP_PCTD_03=1&EFXP_SUBT_03=1&EFXP_FMA_PAGO=2&EFXP_SUBTOTAL=3&EFXP_PCT_DESC=0&EFXP_MNT_DESC=0&IVA_TEMP=0&MNT_NETO_TEMP=0&EFXP_MNT_NETO=3&EFXP_TASA_IVA=19&EFXP_IVA=1&EFXP_MNT_TOTAL=4",
    },
    function (err, res, body) {
      if (err) {
        console.log(err);
      } else {
        console.log(res.statusCode);
        console.log(res);
      }
    }
  );
  // .on("error", (err) => {
  //   console.error(err);
  // })
  // .pipe(fs.createWriteStream(filename))
  // .on("finish", () => {
  //   console.log(`Archivo descargado: ${filename}`);
  // });
};

const test = async (instance_id) => {
  const options = JSON.parse(fs.readFileSync("options.json"));
  let cert = null;
  try {
    cert = fs.readFileSync(path.join(__dirname, instance_id + ".cer"));
  } catch (error) {
    console.log(error);
    await browser.close();
    return null;
  }
  let key = null;
  try {
    key = fs.readFileSync(path.join(__dirname, instance_id + ".key"));
  } catch (error) {
    console.log(error);
    await browser.close();
    return null;
  }
  options.agentOptions.key = key;
  options.agentOptions.cert = cert;
  options.passphrase = `${instance_id}`;
  const generateCookies = await cookies(options);
  console.log(generateCookies);
  await previewEmitFactAfect(generateCookies);
  //await cafInfo(generateCookies);
  //await downloadXml(generateCookies);
};
//getCookies(43);
//testCertificate();
test(6359);
module.exports = {
  getCookies,
};
