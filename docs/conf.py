# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'Groovescore'
copyright = '2022-2024, Jani Nikula'
author = 'Jani Nikula'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = []

templates_path = ['_templates']
exclude_patterns = ['_build']

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output
# https://alabaster.readthedocs.io/en/stable/customization.html

html_theme = 'alabaster'
html_static_path = ['_static']

html_theme_options = {
    'description': 'Snooker Scoreboard',
    'extra_nav_links': {
        'Scoreboard App': 'latest.html',
        'GitHub Project': 'https://github.com/groovescore/snooker-scoreboard',
    }
}

html_sidebars = {
    '**': [
        'about.html',
        'navigation.html',
    ]
}
