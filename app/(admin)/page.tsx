"use client";


import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Toolbar } from "primereact/toolbar";

export default function Home() {
  const startContent = (
      <>
          <Button size="small" label="New" icon="pi pi-plus" className="mr-2" />
      </>
  );

  return (
    <>    
     <Card title="Employees">
        <Toolbar className="mb-4" start={startContent} center={<></>} end={<></>} />
        
        <p className="m-0">
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore sed consequuntur error repudiandae 
            numquam deserunt quisquam repellat libero asperiores earum nam nobis, culpa ratione quam perferendis esse, cupiditate neque quas!
        </p>
      </Card>
    </>
  );
}
