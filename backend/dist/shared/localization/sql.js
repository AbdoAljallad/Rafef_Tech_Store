export function localizedFieldExpression(options) {
    const languageParam = options.languageParam ?? ':language';
    return `COALESCE((
    SELECT et.text_value
    FROM entity_translations et
    WHERE et.entity_type = '${options.entityType}'
      AND et.entity_id = ${options.entityIdExpression}
      AND et.field_name = '${options.fieldName}'
      AND et.lang_code = ${languageParam}
    LIMIT 1
  ), ${options.fallbackExpression})`;
}
