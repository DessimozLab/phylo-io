import unittest
import os
import time
from selenium import webdriver
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC


class PythonOrgSearch(unittest.TestCase):
    
    def setUp(self):
        self.driver = webdriver.SafariDriver()

    def check_exists(self, docID):
        driver = self.driver
        try:
            driver.find_element_by_id(docID)
        except NoSuchElementException:
            return False
        return True
    
    
    def test_autocollapse(self):
        '''
        Function to test autocollapse of 
        '''
        driver = self.driver
        driver.get("file:///Users/daviddylus/Dropbox/dessimoz/research/opt/gitlab/phylo-io/www/index.html")
        driver.find_element_by_link_text("Large Example Tree").click()
        driver.find_element_by_id("renderButton").click()
        driver.find_element_by_id("settings").click()
        driver.find_element_by_id("collapseInc").click()
        driver.find_element_by_id("collapseInc").click()
        driver.find_element_by_id("collapseInc").click()
        assert(self.check_exists("Tree_0_node_227"))
        driver.find_element_by_id("compare-btn").click()
        driver.find_element_by_link_text("Small Example Trees").click()
        driver.find_element_by_id("renderButton").click()
        for i in range(0,3):
            driver.find_element_by_id("collapseInc").click()
        assert self.check_exists("Tree_1_node_24")
        assert driver.find_element_by_id("collapseAmount").text == "2"
        #driver.quit()

    def test_tree_toggle_compare(self):
        with open(os.getcwd()+"/test.nwk", 'r') as content_file:
            content = content_file.read()
        driver = self.driver
        driver.get("file:///Users/daviddylus/Dropbox/dessimoz/research/opt/gitlab/phylo-io/www/index.html")
        driver.find_element_by_id("compare-btn").click()
        driver.find_element_by_id("newickIn1").send_keys(content)
        driver.find_element_by_id("newickIn2").send_keys(content)
        driver.find_element_by_id("renderButton").click()
        wait = WebDriverWait(driver, 5)
        driver.find_element_by_xpath("//div[@id='vis-container1']//button[@id='dropDownToggleButton']").click()
        driver.find_element_by_id("vis-container1_tree_8").click()
        assert(self.check_exists("Tree_8_node_222"))
        driver.find_element_by_xpath("//div[@id='vis-container2']//button[@id='dropDownToggleButton']").click()
        driver.find_element_by_id("vis-container2_tree_16").click()
        assert(self.check_exists("Tree_16_node_134"))
    
    def test_search_large_tree_compare(self):
        driver = self.driver
        driver.get("file:///Users/daviddylus/Dropbox/dessimoz/research/opt/gitlab/phylo-io/www/index.html")
        driver.find_element_by_id("compare-btn").click()
        driver.find_element_by_link_text("Large Example Trees").click()
        driver.find_element_by_id("renderButton").click()
        time.sleep(15)
        driver.find_element_by_id("searchButtonvis-container1").click()
        driver.find_element_by_id("searchInputvis-container1").send_keys("manes2")
        wait = WebDriverWait(driver,10);
        wait.until(EC.element_to_be_clickable((By.ID, 'MANES21353'))).click()
        assert(self.check_exists("Tree_0_node_226"))


    def tearDown(self):
        self.driver.close()
        #self.driver.quit()

if __name__ == "__main__":
    unittest.main()


