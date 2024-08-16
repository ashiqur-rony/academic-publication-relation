# Visual analytics tool for academic publications
The visual analytics tool is developed to visualize the relationships between attributes in academic publications. This tool can be useful to find relation between researchers, research domains, and progress of research over time. The tool is developed using `D3.js` and `HTML`. 

## Dataset
The dataset is curated by the author containing `64` academic publications in the field of `Non-destructive Inspection`. The publications are categorized in four primary groups and 19 categories.

The following CSV files are used for the visualization:

**`categories.csv`**    
This file contains all the `groups` and `categories` of the publications.

**`ndi_papers.csv`**  
This file contains all the academic publications with many different attributes. Only the attributes used for the visualization are listed below:
- `Title`
- `Authors`
- `Publication Year`
- `Abstract`
- `Group`
- `Category`
- ...
- ...

### Data preprocessing
The data preprocessing is done using `Pandas` to create encoding for authors and perform cleanup on different attributes. This cleanup helps with the exploration and understanding of the data. However, it is not mandatory for the visualization. 

## Visualization
A live version of the visual analytics tool is available at: https://ashiqur-rony.github.io/academic-publication-relation/