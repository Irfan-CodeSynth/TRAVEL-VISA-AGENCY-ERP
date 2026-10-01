import { prisma } from './prisma';

export const generateSequenceId = async (entity: string): Promise<string> => {
  // Use a transaction to ensure atomic increment and read
  return await prisma.$transaction(async (tx) => {
    // We lock the row to prevent race conditions during concurrent requests
    const seq = await tx.$queryRaw<any[]>`
      SELECT "id", "prefix", "currentValue", "format" 
      FROM "Sequence" 
      WHERE "entity" = ${entity} 
      FOR UPDATE
    `;

    if (!seq || seq.length === 0) {
      throw new Error(`Sequence generator for entity '${entity}' not found.`);
    }

    const { id, prefix, currentValue, format } = seq[0];
    const nextValue = currentValue + 1;

    // Update sequence
    await tx.sequence.update({
      where: { id },
      data: { currentValue: nextValue },
    });

    // Format logic: e.g. '{prefix}-{seq:6}' -> 'CUS-000001'
    let generatedId = format.replace('{prefix}', prefix);
    
    const seqMatch = format.match(/{seq:(\d+)}/);
    if (seqMatch) {
      const padding = parseInt(seqMatch[1], 10);
      const paddedValue = String(nextValue).padStart(padding, '0');
      generatedId = generatedId.replace(seqMatch[0], paddedValue);
    } else {
      generatedId = generatedId.replace('{seq}', String(nextValue));
    }

    return generatedId;
  });
};
