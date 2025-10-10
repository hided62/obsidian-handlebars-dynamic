

const langEn = {
    //command list
    addHandlebarsTemplate: 'Add Handlebars Template',
    defaultTemplate: '```hb\ntpl: template_name\ndata:\n  arg1: value1\n  arg2: value2\n```\n',
    rebuildPage: 'Rebuild Page',
    rebuildTemplate: 'Rebuild Template With Imported Params',

    //codeBlockProcessor
    yamlParseError: 'Yaml parse error',
    noTplValue: 'No template name(value of tpl)',
    noTplExists: 'Template file does not exists',
    invalidTplFileType: 'Template path(tpl) is not a file',
    noData: 'No values',
    templateCompileError: 'Template compile error',

    //setting page
    templateFolder: 'Template Folder',
    templateFolderDesc: 'The folder where templates are stored',
    templateFolderPlaceholder: 'Abstract Templates Path',

    constantFolder: 'Constant Folder',
    constantFolderDesc: 'The folder where constants are stored',
    constantFolderPlaceholder: 'Abstract Constants Path',

    invalidImportParamsType: 'importParams is invalid type',
    importParamsResultIsNotObject: 'importParams result is not a object',
    importParamsFileNotFound: 'importParams file not found',
    invalidImportParamsValue: 'importParams value is invalid',

    hbEnv: 'Handlebars Environment',
    hbEnvDesc: 'JSON Environment variables for handlebars',
}

type LangDef = Record<keyof typeof langEn, string>;

const langKo = {
    //command list
    addHandlebarsTemplate: 'Handlebars 템플릿 추가',
    defaultTemplate: '```hb\ntpl: 템플릿이름\ndata:\n  변수명1: value1\n  변수명2: value2\n```\n',
    rebuildPage: '페이지 다시 렌더링',
    rebuildTemplate: '파라미터를 포함한 템플릿 다시 빌드',

    //codeBlockProcessor
    yamlParseError: 'YAML 문법 에러',
    noTplValue: '`tpl` 값이 없습니다.',
    noTplExists: '템플릿 파일이 존재하지 않습니다.',
    invalidTplFileType: '`tpl` 값으로 지정된 경로가 파일이 아닙니다.',
    noData: '값이 없습니다.',
    templateCompileError: '템플릿 컴파일 에러',


    //setting page
    templateFolder: '템플릿 폴더',
    templateFolderDesc: '템플릿이 저장된 폴더',
    templateFolderPlaceholder: '절대경로로 입력해주세요',

    constantFolder: '상수 폴더',
    constantFolderDesc: '상수가 저장된 폴더',
    constantFolderPlaceholder: '절대경로로 입력해주세요',

    invalidImportParamsType: 'importParams가 올바른 형식이 아닙니다.',
    importParamsResultIsNotObject: 'importParams 결과가 객체가 아닙니다.',
    importParamsFileNotFound: 'importParams 파일을 찾을 수 없습니다.',
    invalidImportParamsValue: 'importParams 값이 올바르지 않습니다.',

    hbEnv: '핸들바 환경변수',
    hbEnvDesc: 'JSON 타입으로 지정된 핸들바 환경변수',
} satisfies LangDef;

export const langMap = {
    ko: langKo,
    en: langEn,
} satisfies Record<string, LangDef>;

let currentLang: keyof typeof langMap = 'en';
export function setLanguage(lang: string) {
    if (lang in langMap) {
        currentLang = lang as keyof typeof langMap;
    }
    else {
        currentLang = 'en';
        console.warn('Unsupported language:', lang);
    }
}


export function i18n(key: keyof typeof langKo) {
    return langMap[currentLang][key];
}
