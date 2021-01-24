// Node modules.
import { mkdirp, writeFile } from 'fs-extra';
// Local modules.
import { getResearches } from './research';

const main = async () => {
  const outputPath = './artifacts';
  await mkdirp(outputPath);

  // Researches.
  try {
    const researches = await getResearches();
    await writeFile(`${outputPath}/researches.json`, JSON.stringify(researches, null, 2));
    await writeFile(`${outputPath}/researches.min.json`, JSON.stringify(researches));
  } catch (e) {
    console.error(e);
  }
};

main();
