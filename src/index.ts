// Node modules.
import { mkdirp, writeFile } from 'fs-extra';
// Local modules.
import { getResearches } from './research';
import { getRocketInvasions } from './rocket-invasions';
import { getEggs } from './egg';

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
  
  // Rocket invasions.
  try {
    const rocketInvasions = await getRocketInvasions();
    await writeFile(`${outputPath}/rocket-invasions.json`, JSON.stringify(rocketInvasions, null, 2));
    await writeFile(`${outputPath}/rocket-invasions.min.json`, JSON.stringify(rocketInvasions));
  } catch (e) {
    console.error(e);
  }

  // Eggs.
  try {
    const eggs = await getEggs();
    await writeFile(`${outputPath}/eggs.json`, JSON.stringify(eggs, null, 2));
    await writeFile(`${outputPath}/eggs.min.json`, JSON.stringify(eggs));
  } catch (e) {
    console.error(e);
  }
};

main();
