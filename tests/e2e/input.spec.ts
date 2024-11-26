import { test, expect } from "@playwright/test";

test("should have input with id first_name_1", async ({ page }) => {
    `/render-form?data={"data"%3A{"first_name_1"%3A"Test%20 First Name"%2C"date_of_birth_2"%3A"2024-08-01"%2C"eye_colour_3"%3A"3"%2C"canadian_citizen_4"%3Atrue%2C"comments_5"%3A"Hello world"%2C"gender_6"%3A"3"%2C"age_7"%3A6}%2C"metadata"%3A{"form_id"%3A"formID_CFXXXX"%2C"form_uuid"%3A"repeater_in_KLAMM"%2C"form_version"%3A"form_version_in_KLAMM"%2C"submitted_date"%3A"YYYY-MM-DD"%2C"updated_date"%3A"YYYY_MM_DD"%2C"updated_by"%3A"I DIR%2FBCID%2FBCEID"%2C"attachment_id"%3A"ICM-atttachment-id"}%2C"form_definition"%3A{"version"%3A"0.0.1"%2C"ministry_id"%3A"2"%2C"id"%3A"3ccc37bd-0a03-4cd7-8611-9acfe9daf23d"%2C"lastModified"%3A"2024-08-14T17%3A01%3A52%2B00%3A00"%2C"title"%3A"Simple Form"%2C"data"%3A{"items"%3A[{"type"%3A"text-input"%2C"label"%3A"First Name"%2C"id"%3A"first_name_1"%2C"fieldId"%3A"1"%2C"codeContext"%3A{"name"%3A"first_name"}%2C"placeholder"%3A"Enter your First Name"%2C"helperText"%3A"First Name as it appears on official documents"%2C"inputType"%3A"text"%2C"validation"%3A[{"type"%3A"required"%2C"value"%3Atrue%2C"errorMessage"%3A""}%2C{"type"%3A"maxLength"%2C"value"%3A35%2C"errorMessage"%3A"First Name cannot be more than 35 letters"}%2C{"type"%3A"minLength"%2C"value"%3A2%2C"errorMessage"%3A"First Name should be atleast 2 letters"}]}%2C{"type"%3A"date-picker"%2C"label"%3A"Date of Birth"%2C"id"%3A"date_of_birth_2"%2C"fieldId"%3A"3"%2C"codeContext"%3A{"name"%3A"date_of_birth"}%2C"labelText"%3A"Date of Birth"%2C"placeholder"%3A"mm%2Fdd%2Fyyyy"%2C"validation"%3A[{"type"%3A"required"%2C"value"%3Atrue%2C"errorMessage"%3A"Date of birth should be submitted"}%2C{"type"%3A"maxDate"%2C"value"%3A"2024-09-01"%2C"errorMessage"%3A"Date should be less than September 1st 2024 due to legislation"}%2C{"type"%3A"minDate"%2C"value"%3A"2000-01-01"%2C"errorMessage"%3A"Date should be greater than January 1st 2000 due to legislations"}%2C{"type"%3A"format"%2C"value"%3A"Y-M-d"%2C"errorMessage"%3A"Date should be greater than January 1st 2000 due to legislations"}]}%2C{"type"%3A"dropdown"%2C"label"%3A"Eye Colour"%2C"id"%3A"eye_colour_3"%2C"fieldId"%3A4%2C"codeContext"%3A{"name"%3A"eye_colour"}%2C"placeholder"%3A"Select your Eye Colour"%2C"isMulti"%3Afalse%2C"isInline"%3Afalse%2C"selectionFeedback"%3A"top-after-reopen"%2C"direction"%3A"bottom"%2C"size"%3A"md"%2C"helperText"%3A"Choose one from the list"%2C"listItems"%3A[{"value"%3A"1"%2C"text"%3A"Brown"}%2C{"value"%3A"2"%2C"text"%3A"Black"}%2C{"value"%3A"3"%2C"text"%3A"Blue"}%2C{"value"%3A"4"%2C"text"%3A"Green"}]}%2C{"type"%3A"toggle"%2C"label"%3A"Canadian Citizen"%2C"id"%3A"canadian_citizen_4"%2C"fieldId"%3A"5"%2C"codeContext"%3A{"name"%3A"canadian_citizen"}%2C"header"%3A"Enable Canadian Citizen"%2C"offText"%3A"Off"%2C"onText"%3A"On"%2C"disabled"%3Afalse%2C"checked"%3Afalse%2C"size"%3A"md"}%2C{"type"%3A"text-area"%2C"label"%3A"Comments"%2C"id"%3A"comments_5"%2C"fieldId"%3A"7"%2C"codeContext"%3A{"name"%3A"comments"}%2C"placeholder"%3A"Enter your Comments"%2C"helperText"%3A"Comments as it appears on official documents"%2C"inputType"%3A"text"%2C"validation"%3A[{"type"%3A"maxLength"%2C"value"%3A"100"%2C"errorMessage"%3A"Comments should not exceed 100 characters"}]}%2C{"type"%3A"radio"%2C"label"%3A"Gender"%2C"id"%3A"gender_6"%2C"fieldId"%3A16%2C"codeContext"%3A{"name"%3A"gender"}%2C"placeholder"%3A"Select your Gender"%2C"helperText"%3A"Choose one from the list"%2C"listItems"%3A[{"value"%3A"1"%2C"text"%3A"Male"}%2C{"value"%3A"2"%2C"text"%3A"Female"}%2C{"value"%3A"3"%2C"text"%3A"Other"}%2C{"value"%3A"4"%2C"text"%3A"Prefer not to say"}]}%2C{"type"%3A"number-input"%2C"label"%3A"Age"%2C"id"%3A"age_7"%2C"fieldId"%3A"11"%2C"codeContext"%3A{"name"%3A"age"}%2C"placeholder"%3A"Enter your Age"%2C"helperText"%3A"Age as it appears on official documents"%2C"validation"%3A[{"type"%3A"minValue"%2C"value"%3A5%2C"errorMessage"%3A"Age should be greater than 5"}%2C{"type"%3A"maxValue"%2C"value"%3A18%2C"errorMessage"%3A"Age should be less than 18"}]}]}}}`
  const mockJson = {
    "save_data":{
      "form_definition": {
    "formid": 123,
    "title": 'Mocked Title',
    "description": 'This is a mocked description.',
    "data":{
      "items":[
	{
            "type":"text-input",
            "label":"First Name",
            "id":"firstName",
            "fieldId":"1",
            "codeContext":{
               "name":"message_id"
            },
            "placeholder":"Enter your Message ID",
            "helperText":"Message ID as it appears on official documents",
            "inputType":"text",           
            
         },
	{
            "type":"text-input",
            "label":"Case Name",
            "id":"case_name_1",
            "fieldId":"1",
            "codeContext":{
               "name":"case_name"
            },
            "placeholder":"Enter your case name",
            "helperText":"First Name as it appears on official documents",
            "inputType":"text",            
           
         },
      ] 
        }
      }
    }
  };
   // Intercept the API request and respond with mock JSON
   await page.route('**/generate', async (route) => {   
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockJson),
      });   
  });
  await page.goto(`/new?formId=123`);  
  await expect(page.locator('input#firstName')).toBeVisible();
});
