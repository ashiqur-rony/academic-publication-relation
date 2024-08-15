# Visual analytics tool for text data
The dataset contains 41 text documents consisting of fictional reports about suspicious activities from intelligence agencies, which we will use to create an interactive visualization. The goal of the visualization is to represent the textual data for an analyst to identify connections and potential threats easily. Through our visual analytics tool, we will try to answer WHO, WHEN, and WHERE for possible threats. 

## Dataset
The source dataset is available in the `data` folder. The dataset contains 41 text files, each containing a report about suspicious activities. The reports are from different intelligence agencies. We used `Spacy` to identify named entities and verb phrases from the text. We also used `Spacy` to render the HTML with highlighted entities. The rendered HTML is then used to create highlighted text visualization of the source files.

The following CSV files are extracted from the text files:

**`combined_data.csv`**    
This file contains all the texts from all the source text files, along with the source and report date.

**`entities.csv`**  
This file contains all the entities extracted from the texts.

**`renders.csv`**  
This file contains the rendered HTML from the texts with highlighted entities.

**`nouns.csv`**  
This file contains all the noun phrases from the texts. We did not use this file in the visualization.

### Data preprocessing
The data preprocessing is done using `Spacy`. The source `notebook` for the preprocessing is available at: https://gist.github.com/ashiqur-rony/d4016e3301b96b48252e7ea4dd3c293a 

## Visualization
A live version of the visual analytics tool is available at: https://ashiqur-rony.github.io/visualize-entity-relations/