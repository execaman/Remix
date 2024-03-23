import { request } from "undici";
import { stringify } from "node:querystring";

export default async function translate(text: string, target = "en") {
  if (typeof text !== "string" || typeof target !== "string") {
    throw new TypeError(
      typeof text !== "string" ?
        "Text to translate is not a string"
      : "Target language is not a string"
    );
  }

  const { body } = await request(
    "https://translate.google.com/translate_a/single",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        "User-Agent":
          "AndroidTranslate/5.3.0.RC02.130475354-53000263 5.1 phone TRANSLATE_OPM5_TEST_1"
      },

      query: {
        client: "at",
        dt: ["t", "ld", "qca", "rm", "bd"],
        dj: 1,
        hl: target,
        ie: "UTF-8",
        oe: "UTF-8",
        inputm: 2,
        otf: 2,
        iid: "1dd3b944-fa62-4b55-b330-74909a99969e"
      },

      body: stringify({
        sl: "auto",
        tl: target,
        q: text
      })
    }
  );

  const json = await body.json();

  return json as Translation;
}

interface ModelTracking {
  model_tracking: {
    checkpoint_md5: string;
    launch_doc: string;
  };
}

interface Untranslatable {
  has_untranslatable_chunk: boolean;
}

type DebugInfo = ModelTracking | Untranslatable;

interface Sentence {
  trans: string;
  orig: string;
  backend: number;
  model_specification?: [{}];
  translation_engine_debug_info: DebugInfo[];
}

interface Translation {
  sentences: (Sentence & { src_translit: string })[];
  src: string;
  confidence: number;
  spell: {};
  ld_result: {
    srclangs: string[];
    srclangs_confidences: number[];
    extended_srclangs: string[];
  };
}
